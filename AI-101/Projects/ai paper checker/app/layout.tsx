import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Checker",
  description: "AI grading for student papers with rubric-based feedback.",
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("paper-checker-theme");
    const useDark = stored ? stored === "dark" : true;
    document.documentElement.classList.toggle("dark", useDark);
    document.documentElement.style.colorScheme = useDark ? "dark" : "light";
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
