# Paper Checker

Paper Checker is a Next.js app that uses Gemini to grade student papers with a question paper, rubric/model answers, and optional teacher instructions. It supports uploaded files and pasted text, then generates per-student feedback, a class summary, and downloadable PDF/CSV reports.

## Features

- Upload or paste student papers.
- Upload or paste the question paper.
- Upload or paste rubric/model answers.
- Add optional grading instructions.
- Grade multiple students with progress updates.
- Keep grading other students if one paper fails.
- View marks, strengths, improvements, and flags for each student.
- Download reports as PDF or CSV.
- Use **View sample report** to test the app without preparing files or using a Gemini API key.
- Switch between dark and light mode.

## Requirements

- Node.js 20 or newer.
- npm.
- Gemini API key for real AI grading. The sample report works without one.

## Quick Start

Open this project folder in a terminal, then install dependencies:

```bash
npm install
```

If you only want to view the built-in sample report, you can skip the API key setup and start the app.

For real AI grading, create your local environment file by copying the example file:

```bash
cp .env.example .env
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder API key with your real Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GRADING_DELAY_MS=1500
```

Start the development server:

```bash
npm run dev
```

Open the app in your browser:

```text
http://localhost:3000
```

## How To Use

1. Add student papers in the **Student Papers** section.
2. Add the **Question Paper**.
3. Add the **Rubric / Model Answers**.
4. Add **Additional Instructions** if needed.
5. Click **Grade Papers**.
6. Review the student results and class summary.
7. Click **Download PDF** or **Export as CSV** after grading.

For a quick demo, click **View sample report**. It loads sample data and prebuilt results in the browser, so it does not call Gemini and does not use API credits.

## Supported Files

Student papers, question papers, and rubrics support:

```text
PDF, DOCX, PNG, JPG, JPEG, TXT
```

You can also paste text instead of uploading files. Additional instruction uploads support PDF, and instructions can also be pasted as text.

## Commands

Install packages:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Start the production server after building:

```bash
npm run start
```

The `npm run lint` command exists, but it may ask you to configure ESLint first. It is not required just to run the app.

## Environment Variables

Use `.env.example` as the template for your local `.env` file.

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GRADING_DELAY_MS=1500
```

- `GEMINI_API_KEY` is required.
- `GEMINI_MODEL` is optional. The app defaults to `gemini-2.5-flash`.
- `GRADING_DELAY_MS` is optional. It controls the pause between grading each student.

Keep `.env` private. Do not commit real API keys.

## Important Files

- `app/page.tsx` - Main app UI, local sample report button, results, PDF export, and CSV export.
- `app/api/grade/route.ts` - Server-side grading API that calls Gemini.
- `app/layout.tsx` - App metadata and theme setup.
- `app/globals.css` - Global styles.
- `tailwind.config.ts` - Tailwind CSS configuration.
- `package.json` - Dependencies and npm commands.
- `.env.example` - Safe template for environment variables.
- `.env` - Your private local environment file.

## Troubleshooting

- If you see `GEMINI_API_KEY is not configured`, check `.env` and restart the dev server.
- If a file upload does not work, try pasting the same content as text.
- If port `3000` is busy, Next.js may choose another port. Use the URL shown in the terminal.
- If you only want to test the app quickly, use **View sample report**. It does not require `GEMINI_API_KEY`.
