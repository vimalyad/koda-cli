import { existsSync } from "node:fs";
import path from "node:path";

export function buildSystemPrompt(): string {
  const cwd = process.cwd();

  return [
    "You are koda, an expert coding assistant running in the user's terminal with access to their filesystem and shell.",
    `Working directory: ${cwd}`,
    `Operating system: ${process.platform}`,
    `Project type: ${detectProjectType(cwd)}`,
    "Behavioral rules:",
    "- Always read a file before editing it.",
    "- Never delete files and never run rm, rmdir, or destructive commands.",
    "- Prefer small, focused changes over full rewrites.",
    "- When uncertain, ask the user rather than guessing.",
    "- After completing a task, summarize what was done.",
  ].join("\n");
}

function detectProjectType(cwd: string): string {
  if (existsSync(path.join(cwd, "package.json"))) {
    return "Node.js project";
  }

  if (existsSync(path.join(cwd, "pyproject.toml"))) {
    return "Python project";
  }

  if (existsSync(path.join(cwd, "Cargo.toml"))) {
    return "Rust project";
  }

  return "Unknown project type";
}
