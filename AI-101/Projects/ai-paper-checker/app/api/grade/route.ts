import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRADING_SYSTEM_PROMPT = `You are an experienced, fair, and detail-oriented exam grader.
You will be given the question paper, a rubric/model answers with mark
allocations, optional additional instructions, and one student's
submitted answers.

For each question: read the student's answer fully, compare it to the
rubric (checking concepts/reasoning/accuracy, not just wording), decide
the marks following the rubric and any additional instructions, and
give a one-line reason for the mark.

Then give: total score, 2-3 specific strengths, 2-3 specific
improvements, and any flags (blank answers, mismatched answers, wording
copied verbatim from the rubric).`;

const RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    student_name: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING },
          marks: { type: Type.NUMBER },
          max_marks: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ["number", "marks", "max_marks", "reason"],
      },
    },
    total: { type: Type.NUMBER },
    max_total: { type: Type.NUMBER },
    percentage: { type: Type.NUMBER },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    flags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "student_name",
    "questions",
    "total",
    "max_total",
    "percentage",
    "strengths",
    "improvements",
    "flags",
  ],
};

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type StudentInput =
  | {
      kind: "file";
      name: string;
      file: File;
    }
  | {
      kind: "text";
      name: string;
      text: string;
    };

const DEFAULT_GRADING_DELAY_MS = 1500;
const MAX_GRADING_DELAY_MS = 60000;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getGradingDelayMs() {
  const configured = Number(process.env.GRADING_DELAY_MS ?? DEFAULT_GRADING_DELAY_MS);
  if (!Number.isFinite(configured) || configured < 0) {
    return DEFAULT_GRADING_DELAY_MS;
  }

  return Math.min(Math.round(configured), MAX_GRADING_DELAY_MS);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "name" in value;
}

function extensionOf(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}

function mimeTypeFor(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = extensionOf(file.name);
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "txt") return "text/plain";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

async function fileToParts(file: File, label: string): Promise<GeminiPart[]> {
  if (!file.size) {
    throw new Error(`${file.name || label} is empty.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = extensionOf(file.name);
  const mimeType = mimeTypeFor(file);
  const heading = `${label} (${file.name || "uploaded file"})`;

  if (extension === "docx" || mimeType.includes("wordprocessingml.document")) {
    const extracted = await mammoth.extractRawText({ buffer });
    const text = extracted.value.trim();
    if (!text) {
      throw new Error(`${file.name} did not contain extractable text.`);
    }
    return [{ text: `${heading}:\n${text}` }];
  }

  if (extension === "txt" || mimeType.startsWith("text/")) {
    const text = buffer.toString("utf8").trim();
    if (!text) {
      throw new Error(`${file.name} did not contain text.`);
    }
    return [{ text: `${heading}:\n${text}` }];
  }

  if (
    extension === "pdf" ||
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/")
  ) {
    return [
      { text: `${heading} is attached below.` },
      {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      },
    ];
  }

  throw new Error(`${file.name} is not a supported file type.`);
}

async function sourceToParts(formData: FormData, kind: "question" | "rubric") {
  const mode = getString(formData, `${kind}Mode`) || "text";
  const label = kind === "question" ? "Question paper" : "Rubric / model answers";

  if (mode === "text") {
    const text = getString(formData, `${kind}Text`).trim();
    if (!text) {
      throw new Error(`${label} text is required.`);
    }
    return [{ text: `${label}:\n${text}` }] satisfies GeminiPart[];
  }

  const file = formData.get(`${kind}File`);
  if (!isUploadedFile(file)) {
    throw new Error(`${label} file is required.`);
  }

  return fileToParts(file, label);
}

async function additionalInstructionsToParts(formData: FormData) {
  const parts: GeminiPart[] = [];
  const text = getString(formData, "additionalInstructions").trim();
  const file = formData.get("additionalInstructionsFile");

  if (text) {
    parts.push({ text: `Typed additional instructions:\n${text}` });
  }

  if (isUploadedFile(file)) {
    const extension = extensionOf(file.name);
    const mimeType = mimeTypeFor(file);
    if (extension !== "pdf" && mimeType !== "application/pdf") {
      throw new Error("Additional instructions must be uploaded as a PDF.");
    }
    parts.push(...(await fileToParts(file, "Additional instructions PDF")));
  }

  return parts.length ? parts : ([{ text: "Additional instructions: none." }] satisfies GeminiPart[]);
}

function parseStudentTextInputs(value: string): StudentInput[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && typeof entry === "object")
      .map((entry, index) => ({
        kind: "text" as const,
        name:
          typeof entry.studentName === "string" && entry.studentName.trim()
            ? entry.studentName.trim()
            : `Student ${index + 1}`,
        text: typeof entry.text === "string" ? entry.text : "",
      }))
      .filter((entry) => entry.text.trim());
  } catch {
    return [];
  }
}

function parseStudentNames(value: string, count: number) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, count)
      .map((name) => (typeof name === "string" ? name.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function cleanJson(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function normalizeResult(value: unknown, fallbackName: string) {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini returned an invalid result.");
  }

  const result = value as Record<string, unknown>;
  return {
    student_name:
      typeof result.student_name === "string" && result.student_name.trim()
        ? result.student_name.trim()
        : fallbackName,
    questions: Array.isArray(result.questions)
      ? result.questions.map((question, index) => {
          const row = question && typeof question === "object" ? (question as Record<string, unknown>) : {};
          return {
            number:
              typeof row.number === "string" && row.number.trim()
                ? row.number.trim()
                : String(index + 1),
            marks: Number(row.marks ?? 0),
            max_marks: Number(row.max_marks ?? 0),
            reason: typeof row.reason === "string" ? row.reason : "",
          };
        })
      : [],
    total: Number(result.total ?? 0),
    max_total: Number(result.max_total ?? 0),
    percentage: Number(result.percentage ?? 0),
    strengths: Array.isArray(result.strengths)
      ? result.strengths.filter((item): item is string => typeof item === "string")
      : [],
    improvements: Array.isArray(result.improvements)
      ? result.improvements.filter((item): item is string => typeof item === "string")
      : [],
    flags: Array.isArray(result.flags)
      ? result.flags.filter((item): item is string => typeof item === "string")
      : [],
  };
}

async function gradeStudent({
  ai,
  questionParts,
  rubricParts,
  additionalInstructionParts,
  student,
}: {
  ai: GoogleGenAI;
  questionParts: GeminiPart[];
  rubricParts: GeminiPart[];
  additionalInstructionParts: GeminiPart[];
  student: StudentInput;
}) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (model.startsWith("gemini-2.0")) {
    throw new Error("GEMINI_MODEL must not use retired gemini-2.0 models.");
  }

  const studentParts =
    student.kind === "file"
      ? await fileToParts(student.file, `Student submission for ${student.name}`)
      : [{ text: `Student submission for ${student.name}:\n${student.text}` }];

  const parts: GeminiPart[] = [
    { text: "Question paper" },
    ...questionParts,
    { text: "Rubric / model answers" },
    ...rubricParts,
    { text: "Additional instructions" },
    ...additionalInstructionParts,
    { text: `Student name: ${student.name}` },
    ...studentParts,
    { text: "Return only JSON that matches the response schema." },
  ];

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }] as never,
    config: {
      systemInstruction: GRADING_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESULT_SCHEMA,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const parsed = JSON.parse(cleanJson(text));
  return normalizeResult(parsed, student.name);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  let questionParts: GeminiPart[];
  let rubricParts: GeminiPart[];
  let additionalInstructionParts: GeminiPart[];
  try {
    questionParts = await sourceToParts(formData, "question");
    rubricParts = await sourceToParts(formData, "rubric");
    additionalInstructionParts = await additionalInstructionsToParts(formData);
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 400 });
  }

  const files = formData.getAll("studentFiles").filter(isUploadedFile);
  const names = parseStudentNames(getString(formData, "studentNames"), files.length);
  const fileStudents = files.map((file, index) => ({
    kind: "file" as const,
    name: names[index] || file.name.replace(/\.[^.]+$/, "") || `Student ${index + 1}`,
    file,
  }));
  const textStudents = parseStudentTextInputs(getString(formData, "studentTexts"));
  const students: StudentInput[] = [...fileStudents, ...textStudents];

  if (!students.length) {
    return Response.json({ error: "At least one student paper is required." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const encoder = new TextEncoder();
  const gradingDelayMs = getGradingDelayMs();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      send({ type: "start", total: students.length });

      for (let index = 0; index < students.length; index += 1) {
        const student = students[index];
        if (index > 0 && gradingDelayMs > 0) {
          send({
            type: "progress",
            index: index + 1,
            total: students.length,
            studentName: student.name,
            message: `Waiting ${Math.ceil(gradingDelayMs / 1000)}s before grading ${student.name}...`,
          });
          await sleep(gradingDelayMs);
        }

        send({
          type: "progress",
          index: index + 1,
          total: students.length,
          studentName: student.name,
          message: `Grading ${student.name}... ${index + 1}/${students.length}`,
        });

        try {
          const result = await gradeStudent({
            ai,
            questionParts,
            rubricParts,
            additionalInstructionParts,
            student,
          });

          send({
            type: "result",
            index: index + 1,
            total: students.length,
            studentName: student.name,
            result,
          });
        } catch (error) {
          send({
            type: "error",
            index: index + 1,
            total: students.length,
            studentName: student.name,
            error: getErrorMessage(error),
          });
        }
      }

      send({ type: "done", total: students.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
