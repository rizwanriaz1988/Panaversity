"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  FileText,
  FileUp,
  GraduationCap,
  LoaderCircle,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SourceMode = "upload" | "text";

type StudentUpload = {
  id: string;
  file: File;
  name: string;
};

type StudentTextUpload = {
  id: string;
  name: string;
  text: string;
};

type QuestionResult = {
  number: string;
  marks: number;
  max_marks: number;
  reason: string;
};

type GradingResult = {
  student_name: string;
  questions: QuestionResult[];
  total: number;
  max_total: number;
  percentage: number;
  strengths: string[];
  improvements: string[];
  flags: string[];
};

type StudentOutcome =
  | {
      status: "success";
      name: string;
      result: GradingResult;
    }
  | {
      status: "error";
      name: string;
      error: string;
    };

type StreamEvent =
  | { type: "start"; total: number }
  | { type: "progress"; index: number; total: number; studentName: string; message: string }
  | { type: "result"; index: number; total: number; studentName: string; result: GradingResult }
  | { type: "error"; index: number; total: number; studentName: string; error: string }
  | { type: "done"; total: number }
  | { type: "fatal"; error: string };

type TextStudentInput = {
  name: string;
  text: string;
};

type GradingRequestOptions = {
  fileStudents?: StudentUpload[];
  textStudents?: TextStudentInput[];
  questionSourceMode?: SourceMode;
  questionSourceFile?: File | null;
  questionSourceText?: string;
  rubricSourceMode?: SourceMode;
  rubricSourceFile?: File | null;
  rubricSourceText?: string;
  instructionsSourceMode?: SourceMode;
  instructionsText?: string;
  instructionsFile?: File | null;
};

const acceptedStudentTypes = ".pdf,.docx,.png,.jpg,.jpeg,.txt";
const acceptedSourceTypes = ".pdf,.docx,.png,.jpg,.jpeg,.txt";
const acceptedInstructionsTypes = ".pdf";
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const sampleQuestionPaper = `Grade 9 Science: Water Cycle Short Test

Answer all questions. Total marks: 20.

Q1. Explain evaporation and condensation in the water cycle. (5 marks)
Q2. Describe how clouds form and how they can lead to precipitation. (5 marks)
Q3. A town removes many trees near a river. Predict two effects this could have on runoff or flooding, and explain your reasoning. (5 marks)
Q4. Suggest two practical actions families or schools can take to conserve water. Explain why each action helps. (5 marks)`;

const sampleRubric = `Rubric / model answers

Q1 - 5 marks:
- 2 marks: evaporation is liquid water changing to water vapor because of heat.
- 2 marks: condensation is water vapor cooling and changing into liquid droplets.
- 1 mark: clearly connects both processes to the water cycle.

Q2 - 5 marks:
- 2 marks: warm moist air rises and cools.
- 2 marks: water vapor condenses on particles to form cloud droplets.
- 1 mark: droplets combine, become heavy, and fall as rain, snow, or other precipitation.

Q3 - 5 marks:
- 2 marks: fewer roots/plants absorb and slow less water.
- 2 marks: runoff increases and river flooding risk can rise.
- 1 mark: explanation links tree removal to soil erosion, faster surface flow, or reduced infiltration.

Q4 - 5 marks:
- 2 marks: gives one realistic conservation action with explanation.
- 2 marks: gives a second realistic conservation action with explanation.
- 1 mark: answer is practical for families or schools.`;

const sampleAdditionalInstructions =
  "Award partial credit for correct ideas even when wording differs from the model answer. Flag blank or copied responses.";

const sampleStudentPapers = [
  {
    name: "Ayesha Khan",
    text: `Q1. Evaporation happens when the Sun heats water in rivers, lakes, or puddles and some of it becomes water vapor. Condensation happens when that vapor cools high in the air and changes back into tiny liquid drops. These two changes keep water moving through the water cycle.

Q2. Warm wet air rises. As it rises it gets cooler, so water vapor condenses around dust and other tiny particles. Many droplets together make a cloud. When the droplets join and get heavy enough, they fall as precipitation such as rain.

Q3. If trees are removed near a river, more rainwater will run quickly over the ground because roots are not holding soil and absorbing water. This can cause more erosion and can make the river rise faster, so flooding becomes more likely.

Q4. Families can fix leaking taps because small leaks waste a lot of water over time. Schools can collect rainwater for gardens, which reduces the need to use clean tap water for plants.`,
  },
  {
    name: "Bilal Ahmed",
    text: `Q1. Evaporation is when water dries up in sunlight and goes into the air. Condensation is when water becomes cold and makes clouds.

Q2. Clouds form from water vapor. The vapor goes up and later rain comes down. I am not sure about the particles.

Q3. Cutting trees can make the place hotter. It may also make floods worse because there are not many trees to stop water, but I did not explain the river part clearly.

Q4. People should turn off taps while brushing. Schools should tell students to save water.`,
  },
];

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function deriveStudentName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Student";
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scoreTone(percentage: number) {
  if (percentage >= 80) {
    return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200";
  }
  if (percentage >= 60) {
    return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200";
  }
  return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function compactPreview(text: string, maxLength = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "No response text.";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}

function cleanPdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function FileDropZone({
  label,
  accept,
  multiple,
  onFiles,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex min-h-36 items-center justify-center rounded-lg border border-dashed px-5 py-6 text-center transition ${
        isDragging
          ? "border-sky-400 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-100"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: SourceMode;
  onChange: (value: SourceMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-300 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-900">
      {(["upload", "text"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`inline-flex min-w-24 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === mode
              ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {mode === "upload" ? <FileUp className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          {mode === "upload" ? "Upload" : "Paste"}
        </button>
      ))}
    </div>
  );
}

function SourceInput({
  title,
  mode,
  onModeChange,
  file,
  onFileChange,
  text,
  onTextChange,
  placeholder,
}: {
  title: string;
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  text: string;
  onTextChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <section className="space-y-4 border-t border-zinc-200 py-6 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <ModeToggle value={mode} onChange={onModeChange} />
      </div>

      {mode === "upload" ? (
        <div className="space-y-3">
          <FileDropZone
            label="Choose file"
            accept={acceptedSourceTypes}
            onFiles={(files) => onFileChange(files[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onFileChange(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={placeholder}
          rows={8}
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      )}
    </section>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("paper-checker-theme");
    const nextTheme = stored === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("paper-checker-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-800 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function ResultCard({ outcome }: { outcome: StudentOutcome }) {
  const [expanded, setExpanded] = useState(false);

  if (outcome.status === "error") {
    return (
      <article className="rounded-lg border border-rose-300 bg-rose-50 p-5 text-rose-950 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">{outcome.name}</h3>
            <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">{outcome.error}</p>
          </div>
        </div>
      </article>
    );
  }

  const result = outcome.result;
  const scoreLabel = `${formatNumber(result.total)}/${formatNumber(result.max_total)} - ${formatNumber(
    result.percentage,
  )}%`;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{result.student_name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${scoreTone(result.percentage)}`}>
              {scoreLabel}
            </span>
            {result.flags.length ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Flagged
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Clear
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Questions
        </button>
      </div>

      {expanded ? (
        <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-3">Question</th>
                <th className="px-3 py-3">Marks</th>
                <th className="px-3 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {result.questions.map((question) => (
                <tr key={`${result.student_name}-${question.number}`}>
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{question.number}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatNumber(question.marks)}/{formatNumber(question.max_marks)}
                  </td>
                  <td className="min-w-72 px-3 py-3 text-zinc-700 dark:text-zinc-300">{question.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Strengths</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {result.strengths.length ? (
              result.strengths.map((item) => <li key={item}>- {item}</li>)
            ) : (
              <li>- No strengths returned.</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-sky-700 dark:text-sky-300">Improvements</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {result.improvements.length ? (
              result.improvements.map((item) => <li key={item}>- {item}</li>)
            ) : (
              <li>- No improvements returned.</li>
            )}
          </ul>
        </div>
      </div>

      {result.flags.length ? (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">Flags</p>
          <ul className="mt-2 space-y-1">
            {result.flags.map((flag) => (
              <li key={flag}>- {flag}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function ClassSummary({ outcomes }: { outcomes: StudentOutcome[] }) {
  const successful = outcomes.filter(
    (outcome): outcome is Extract<StudentOutcome, { status: "success" }> => outcome.status === "success",
  );

  const summary = useMemo(() => {
    if (!successful.length) return null;

    const percentages = successful.map((outcome) => outcome.result.percentage);
    const average = percentages.reduce((sum, score) => sum + score, 0) / percentages.length;
    const min = Math.min(...percentages);
    const max = Math.max(...percentages);

    const questionMap = new Map<string, { earned: number; possible: number; count: number }>();
    for (const outcome of successful) {
      for (const question of outcome.result.questions) {
        const current = questionMap.get(question.number) ?? { earned: 0, possible: 0, count: 0 };
        current.earned += question.marks;
        current.possible += question.max_marks;
        current.count += 1;
        questionMap.set(question.number, current);
      }
    }

    const lowestQuestions = Array.from(questionMap.entries())
      .map(([number, values]) => ({
        number,
        ratio: values.possible > 0 ? values.earned / values.possible : 0,
        averageMarks: values.count > 0 ? values.earned / values.count : 0,
        averageMax: values.count > 0 ? values.possible / values.count : 0,
      }))
      .sort((a, b) => a.ratio - b.ratio || collator.compare(a.number, b.number))
      .slice(0, 3);

    return { average, min, max, lowestQuestions };
  }, [successful]);

  if (!summary) return null;

  const chartData = successful.map((outcome) => ({
    name: outcome.result.student_name,
    score: Number(outcome.result.percentage.toFixed(1)),
  }));

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold">Class Summary</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
            Avg {formatNumber(summary.average)}%
          </span>
          <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
            Range {formatNumber(summary.min)}%-{formatNumber(summary.max)}%
          </span>
        </div>
      </div>

      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 34 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis
              dataKey="name"
              angle={-25}
              textAnchor="end"
              interval={0}
              height={58}
              tick={{ fontSize: 12, fill: "currentColor" }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "currentColor" }} />
            <Tooltip
              cursor={{ fill: "rgba(125, 125, 125, 0.12)" }}
              formatter={(value) => [`${value}%`, "Score"]}
              contentStyle={{ borderRadius: 8 }}
            />
            <Bar dataKey="score" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Lowest Average Questions</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {summary.lowestQuestions.map((question) => (
            <div
              key={question.number}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-sm font-semibold">Question {question.number}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {formatNumber(question.averageMarks)}/{formatNumber(question.averageMax)} avg
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [students, setStudents] = useState<StudentUpload[]>([]);
  const [studentMode, setStudentMode] = useState<SourceMode>("upload");
  const [studentTexts, setStudentTexts] = useState<StudentTextUpload[]>([]);
  const [studentTextName, setStudentTextName] = useState("");
  const [studentTextDraft, setStudentTextDraft] = useState("");
  const [expandedStudentTextIds, setExpandedStudentTextIds] = useState<Set<string>>(() => new Set());
  const [questionMode, setQuestionMode] = useState<SourceMode>("upload");
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [rubricMode, setRubricMode] = useState<SourceMode>("upload");
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [rubricText, setRubricText] = useState("");
  const [additionalInstructionsMode, setAdditionalInstructionsMode] = useState<SourceMode>("text");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [additionalInstructionsFile, setAdditionalInstructionsFile] = useState<File | null>(null);
  const [outcomes, setOutcomes] = useState<StudentOutcome[]>([]);
  const [isGrading, setIsGrading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const addStudentFiles = (files: File[]) => {
    if (!files.length) return;
    setStudents((current) => [
      ...current,
      ...files.map((file) => ({
        id: makeId(),
        file,
        name: deriveStudentName(file.name),
      })),
    ]);
  };

  const addStudentText = () => {
    if (!studentTextDraft.trim()) {
      setError("Paste the student paper text before adding it.");
      return;
    }

    setStudentTexts((current) => [
      ...current,
      {
        id: makeId(),
        name: studentTextName.trim() || `Pasted Student ${current.length + 1}`,
        text: studentTextDraft,
      },
    ]);
    setStudentTextName("");
    setStudentTextDraft("");
    setError("");
  };

  const updateStudentName = (id: string, name: string) => {
    setStudents((current) =>
      current.map((student) => (student.id === id ? { ...student, name } : student)),
    );
  };

  const updateStudentTextName = (id: string, name: string) => {
    setStudentTexts((current) =>
      current.map((student) => (student.id === id ? { ...student, name } : student)),
    );
  };

  const updateStudentText = (id: string, text: string) => {
    setStudentTexts((current) =>
      current.map((student) => (student.id === id ? { ...student, text } : student)),
    );
  };

  const toggleStudentText = (id: string) => {
    setExpandedStudentTextIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeStudent = (id: string) => {
    setStudents((current) => current.filter((student) => student.id !== id));
  };

  const removeStudentText = (id: string) => {
    setStudentTexts((current) => current.filter((student) => student.id !== id));
    setExpandedStudentTextIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const savedStudentTexts = studentTexts.filter((student) => student.text.trim());
  const draftStudentText =
    studentMode === "text" && studentTextDraft.trim()
      ? {
          name: studentTextName.trim() || `Pasted Student ${savedStudentTexts.length + 1}`,
          text: studentTextDraft,
        }
      : null;
  const activeStudentTexts: Array<{ name: string; text: string }> = draftStudentText
    ? [...savedStudentTexts, draftStudentText]
    : savedStudentTexts;
  const studentCount = students.length + activeStudentTexts.length;

  const getGradingSources = (options?: GradingRequestOptions) => ({
    fileStudents: options?.fileStudents ?? students,
    textStudents: options?.textStudents ?? activeStudentTexts,
    questionSourceMode: options?.questionSourceMode ?? questionMode,
    questionSourceFile: options?.questionSourceFile ?? questionFile,
    questionSourceText: options?.questionSourceText ?? questionText,
    rubricSourceMode: options?.rubricSourceMode ?? rubricMode,
    rubricSourceFile: options?.rubricSourceFile ?? rubricFile,
    rubricSourceText: options?.rubricSourceText ?? rubricText,
    instructionsSourceMode: options?.instructionsSourceMode ?? additionalInstructionsMode,
    instructionsText: options?.instructionsText ?? additionalInstructions,
    instructionsFile: options?.instructionsFile ?? additionalInstructionsFile,
  });

  const validate = (options?: GradingRequestOptions) => {
    const sources = getGradingSources(options);
    if (!sources.fileStudents.length && !sources.textStudents.length) return "Add at least one student paper.";
    if (sources.questionSourceMode === "upload" && !sources.questionSourceFile) return "Add a question paper file.";
    if (sources.questionSourceMode === "text" && !sources.questionSourceText.trim()) return "Paste the question paper text.";
    if (sources.rubricSourceMode === "upload" && !sources.rubricSourceFile) return "Add a rubric or model answer file.";
    if (sources.rubricSourceMode === "text" && !sources.rubricSourceText.trim()) return "Paste the rubric or model answers.";
    return "";
  };

  const buildFormData = (options?: GradingRequestOptions) => {
    const sources = getGradingSources(options);
    const formData = new FormData();

    sources.fileStudents.forEach((student) => formData.append("studentFiles", student.file));
    formData.append(
      "studentNames",
      JSON.stringify(sources.fileStudents.map((student) => student.name.trim() || "Student")),
    );
    formData.append(
      "studentTexts",
      JSON.stringify(
        sources.textStudents.map((student, index) => ({
          studentName: student.name.trim() || `Pasted Student ${index + 1}`,
          text: student.text,
        })),
      ),
    );
    formData.append("questionMode", sources.questionSourceMode);
    formData.append("rubricMode", sources.rubricSourceMode);
    formData.append(
      "additionalInstructions",
      sources.instructionsSourceMode === "text" ? sources.instructionsText : "",
    );

    if (sources.instructionsSourceMode === "upload" && sources.instructionsFile) {
      formData.append("additionalInstructionsFile", sources.instructionsFile);
    }

    if (sources.questionSourceMode === "upload" && sources.questionSourceFile) {
      formData.append("questionFile", sources.questionSourceFile);
    } else {
      formData.append("questionText", sources.questionSourceText);
    }

    if (sources.rubricSourceMode === "upload" && sources.rubricSourceFile) {
      formData.append("rubricFile", sources.rubricSourceFile);
    } else {
      formData.append("rubricText", sources.rubricSourceText);
    }

    return formData;
  };

  const handleStreamEvent = (event: StreamEvent) => {
    if (event.type === "progress") {
      setProgress(event.message);
    }

    if (event.type === "result") {
      setOutcomes((current) => [
        ...current,
        {
          status: "success",
          name: event.studentName,
          result: event.result,
        },
      ]);
    }

    if (event.type === "error") {
      setOutcomes((current) => [
        ...current,
        {
          status: "error",
          name: event.studentName,
          error: event.error,
        },
      ]);
    }

    if (event.type === "fatal") {
      setError(event.error);
    }

    if (event.type === "done") {
      setProgress("Grading complete.");
    }
  };

  const submitGradingRequest = async (formData: FormData) => {
    setError("");
    setOutcomes([]);
    setProgress("");
    setIsGrading(true);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "The grading request failed.");
      }

      if (!response.body) {
        throw new Error("The grading response could not be streamed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          handleStreamEvent(JSON.parse(line) as StreamEvent);
        }
      }

      if (buffer.trim()) {
        handleStreamEvent(JSON.parse(buffer) as StreamEvent);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The grading request failed.");
    } finally {
      setIsGrading(false);
    }
  };

  const gradePapers = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    await submitGradingRequest(buildFormData());
  };

  const gradeSamplePapers = async () => {
    const sampleTextStudents = sampleStudentPapers.map((student) => ({
      id: makeId(),
      name: student.name,
      text: student.text,
    }));
    const sampleRequest: GradingRequestOptions = {
      fileStudents: [],
      textStudents: sampleStudentPapers,
      questionSourceMode: "text",
      questionSourceFile: null,
      questionSourceText: sampleQuestionPaper,
      rubricSourceMode: "text",
      rubricSourceFile: null,
      rubricSourceText: sampleRubric,
      instructionsSourceMode: "text",
      instructionsText: sampleAdditionalInstructions,
      instructionsFile: null,
    };

    setStudents([]);
    setStudentMode("text");
    setStudentTexts(sampleTextStudents);
    setStudentTextName("");
    setStudentTextDraft("");
    setExpandedStudentTextIds(new Set());
    setQuestionMode("text");
    setQuestionFile(null);
    setQuestionText(sampleQuestionPaper);
    setRubricMode("text");
    setRubricFile(null);
    setRubricText(sampleRubric);
    setAdditionalInstructionsMode("text");
    setAdditionalInstructions(sampleAdditionalInstructions);
    setAdditionalInstructionsFile(null);

    await submitGradingRequest(buildFormData(sampleRequest));
  };

  const exportCsv = () => {
    const questionNumbers = Array.from(
      new Set(
        outcomes.flatMap((outcome) =>
          outcome.status === "success" ? outcome.result.questions.map((question) => question.number) : [],
        ),
      ),
    ).sort(collator.compare);

    const headers = [
      "Student Name",
      "Status",
      "Total",
      "Max Total",
      "Percentage",
      "Strengths",
      "Improvements",
      "Flags",
      "Error",
      ...questionNumbers.flatMap((number) => [
        `Q${number} Marks`,
        `Q${number} Max Marks`,
        `Q${number} Reason`,
      ]),
    ];

    const rows = outcomes.map((outcome) => {
      if (outcome.status === "error") {
        return [outcome.name, "Error", "", "", "", "", "", "", outcome.error, ...questionNumbers.flatMap(() => ["", "", ""])];
      }

      const questions = new Map(outcome.result.questions.map((question) => [question.number, question]));
      return [
        outcome.result.student_name,
        "Graded",
        outcome.result.total,
        outcome.result.max_total,
        outcome.result.percentage,
        outcome.result.strengths.join("; "),
        outcome.result.improvements.join("; "),
        outcome.result.flags.join("; "),
        "",
        ...questionNumbers.flatMap((number) => {
          const question = questions.get(number);
          return question ? [question.marks, question.max_marks, question.reason] : ["", "", ""];
        }),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paper-checker-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!outcomes.length) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ format: "a4", unit: "pt" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    const bottom = pageHeight - margin;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = new Date().toLocaleDateString();

    const studentNameFor = (outcome: StudentOutcome) =>
      outcome.status === "success" ? outcome.result.student_name : outcome.name;

    const drawHeader = (studentName: string, continued: boolean) => {
      doc.setTextColor(24, 24, 27);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(continued ? "Student Report (continued)" : "Student Report", margin, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated ${generatedAt}`, pageWidth - margin, 42, { align: "right" });
      doc.setDrawColor(212, 212, 216);
      doc.line(margin, 58, pageWidth - margin, 58);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(cleanPdfText(studentName) || "Student", margin, 82);
      return 108;
    };

    outcomes.forEach((outcome, outcomeIndex) => {
      if (outcomeIndex > 0) {
        doc.addPage();
      }

      const studentName = studentNameFor(outcome);
      let y = drawHeader(studentName, false);

      const ensureSpace = (height: number) => {
        if (y + height <= bottom) return;
        doc.addPage();
        y = drawHeader(studentName, true);
      };

      const addSectionTitle = (title: string) => {
        ensureSpace(24);
        doc.setTextColor(24, 24, 27);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(title, margin, y);
        y += 18;
      };

      const addWrappedText = (
        text: string,
        x: number,
        width: number,
        fontSize = 9,
        lineHeight = 12,
        style: "normal" | "bold" = "normal",
      ) => {
        doc.setTextColor(63, 63, 70);
        doc.setFont("helvetica", style);
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(cleanPdfText(text) || "None.", width) as string[];
        for (const line of lines) {
          ensureSpace(lineHeight);
          doc.text(line, x, y);
          y += lineHeight;
        }
      };

      const addBullets = (title: string, items: string[]) => {
        addSectionTitle(title);
        const list = items.length ? items : ["None returned."];
        for (const item of list) {
          addWrappedText(`- ${item}`, margin + 8, contentWidth - 8);
        }
        y += 6;
      };

      if (outcome.status === "error") {
        addSectionTitle("Status");
        addWrappedText("Grading failed for this student.", margin, contentWidth, 10, 14, "bold");
        y += 8;
        addSectionTitle("Error");
        addWrappedText(outcome.error, margin, contentWidth);
        return;
      }

      const result = outcome.result;
      addSectionTitle("Summary");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(14, 116, 144);
      doc.text(`${formatNumber(result.percentage)}%`, margin, y + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(63, 63, 70);
      doc.text(
        `${formatNumber(result.total)} of ${formatNumber(result.max_total)} marks`,
        margin + 118,
        y + 3,
      );
      doc.text(result.flags.length ? "Status: Flagged" : "Status: Clear", margin + 118, y + 19);
      y += 44;

      addBullets("Strengths", result.strengths);
      addBullets("Improvements", result.improvements);

      if (result.flags.length) {
        addBullets("Flags", result.flags);
      }

      addSectionTitle("Question Breakdown");
      ensureSpace(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text("Question", margin, y);
      doc.text("Marks", margin + 72, y);
      doc.text("Reason", margin + 132, y);
      y += 10;
      doc.setDrawColor(228, 228, 231);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      for (const question of result.questions) {
        const reason = compactPreview(question.reason || "No reason returned.", 320);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const reasonLines = doc.splitTextToSize(cleanPdfText(reason), contentWidth - 132) as string[];
        const rowHeight = Math.max(20, reasonLines.length * 10 + 6);
        ensureSpace(rowHeight);
        const rowTop = y;

        doc.setTextColor(24, 24, 27);
        doc.text(cleanPdfText(question.number), margin, y);
        doc.text(`${formatNumber(question.marks)}/${formatNumber(question.max_marks)}`, margin + 72, y);
        doc.setTextColor(63, 63, 70);
        reasonLines.forEach((line, lineIndex) => {
          doc.text(line, margin + 132, rowTop + lineIndex * 10);
        });
        y += rowHeight;
        doc.setDrawColor(244, 244, 245);
        doc.line(margin, y - 4, pageWidth - margin, y - 4);
      }
    });

    doc.save(`paper-checker-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">Paper Checker</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">AI grading workspace</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-0">
            <section className="space-y-4 pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <FileUp className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold">Student Papers</h2>
                </div>
                <ModeToggle value={studentMode} onChange={setStudentMode} />
              </div>
              {studentMode === "upload" ? (
                <FileDropZone
                  label="Add papers"
                  accept={acceptedStudentTypes}
                  multiple
                  onFiles={addStudentFiles}
                />
              ) : (
                <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="min-w-0">
                      <span className="sr-only">Student name for pasted paper</span>
                      <input
                        value={studentTextName}
                        onChange={(event) => setStudentTextName(event.target.value)}
                        placeholder="Student name"
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={addStudentText}
                      disabled={!studentTextDraft.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:focus:ring-offset-zinc-900 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add pasted paper
                    </button>
                  </div>
                  <textarea
                    value={studentTextDraft}
                    onChange={(event) => setStudentTextDraft(event.target.value)}
                    placeholder="Paste student paper text..."
                    rows={8}
                    className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              )}
              {students.length || studentTexts.length ? (
                <div className="max-h-[28rem] divide-y divide-zinc-200 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                  {students.map((student) => (
                    <div key={student.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{student.file.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatBytes(student.file.size)}</p>
                      </div>
                      <label className="min-w-0">
                        <span className="sr-only">Student name</span>
                        <input
                          value={student.name}
                          onChange={(event) => updateStudentName(student.id, event.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove ${student.file.name}`}
                        onClick={() => removeStudent(student.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {studentTexts.map((student) => {
                    const isExpanded = expandedStudentTextIds.has(student.id);
                    return (
                      <div key={student.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto] sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">Pasted student response</p>
                            <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                              {student.text.trim().length} chars
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                            {compactPreview(student.text)}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleStudentText(student.id)}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {isExpanded ? "Hide response" : "Edit response"}
                          </button>
                          {isExpanded ? (
                            <textarea
                              value={student.text}
                              onChange={(event) => updateStudentText(student.id, event.target.value)}
                              rows={4}
                              className="mt-3 max-h-44 w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          ) : null}
                        </div>
                        <label className="min-w-0">
                          <span className="sr-only">Student name</span>
                          <input
                            value={student.name}
                            onChange={(event) => updateStudentTextName(student.id, event.target.value)}
                            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove ${student.name || "pasted student response"}`}
                          onClick={() => removeStudentText(student.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <SourceInput
              title="Question Paper"
              mode={questionMode}
              onModeChange={setQuestionMode}
              file={questionFile}
              onFileChange={setQuestionFile}
              text={questionText}
              onTextChange={setQuestionText}
              placeholder="Paste question paper text..."
            />

            <SourceInput
              title="Rubric / Model Answers"
              mode={rubricMode}
              onModeChange={setRubricMode}
              file={rubricFile}
              onFileChange={setRubricFile}
              text={rubricText}
              onTextChange={setRubricText}
              placeholder="Paste rubric or model answers..."
            />

            <section className="space-y-4 border-t border-zinc-200 py-6 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold">Additional Instructions</h2>
                </div>
                <ModeToggle value={additionalInstructionsMode} onChange={setAdditionalInstructionsMode} />
              </div>
              {additionalInstructionsMode === "upload" ? (
                <div className="space-y-3">
                  <FileDropZone
                    label="Upload instruction PDF"
                    accept={acceptedInstructionsTypes}
                    onFiles={(files) => setAdditionalInstructionsFile(files[0] ?? null)}
                  />
                  {additionalInstructionsFile ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{additionalInstructionsFile.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatBytes(additionalInstructionsFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${additionalInstructionsFile.name}`}
                        onClick={() => setAdditionalInstructionsFile(null)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <textarea
                  value={additionalInstructions}
                  onChange={(event) => setAdditionalInstructions(event.target.value)}
                  placeholder="e.g. be lenient on spelling, give partial credit for correct method..."
                  rows={4}
                  className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">Run</h2>
              <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span>Students</span>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-100">{studentCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Question</span>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                    {questionMode === "upload" ? (questionFile ? "File" : "Missing") : questionText.trim() ? "Text" : "Missing"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Rubric</span>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                    {rubricMode === "upload" ? (rubricFile ? "File" : "Missing") : rubricText.trim() ? "Text" : "Missing"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Instructions</span>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                    {additionalInstructionsMode === "upload"
                      ? additionalInstructionsFile
                        ? "File"
                        : "Optional"
                      : additionalInstructions.trim()
                        ? "Text"
                        : "Optional"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={gradePapers}
                disabled={isGrading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:focus:ring-offset-zinc-900 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
              >
                {isGrading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                Grade Papers
              </button>
              <button
                type="button"
                onClick={gradeSamplePapers}
                disabled={isGrading}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900 dark:focus:ring-offset-zinc-900 dark:disabled:border-zinc-700 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Try sample report
              </button>
              {progress ? (
                <p className="mt-3 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
                  {progress}
                </p>
              ) : null}
              {error ? (
                <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
                  {error}
                </p>
              ) : null}
              {outcomes.length ? (
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-sky-500 dark:text-zinc-950 dark:hover:bg-sky-400 dark:focus:ring-offset-zinc-900"
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export as CSV
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        {outcomes.length ? (
          <section className="mt-8 space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Results</h2>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{outcomes.length} processed</span>
            </div>
            <div className="grid gap-4">
              {outcomes.map((outcome) => (
                <ResultCard
                  key={outcome.status === "success" ? `${outcome.name}-${outcome.result.student_name}` : `${outcome.name}-error`}
                  outcome={outcome}
                />
              ))}
            </div>
            <ClassSummary outcomes={outcomes} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
