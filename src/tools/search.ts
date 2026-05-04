import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  asRecord,
  optionalString,
  requiredString,
  resolveProjectPath,
  shouldIgnoreName,
} from "./common.js";

const MAX_MATCHES = 50;
const CONTEXT_LINES = 1;

export async function searchInFilesTool(args: unknown): Promise<string> {
  try {
    const parsedArgs = asRecord(args);
    const query = requiredString(parsedArgs, "query");
    const pathArg = optionalString(parsedArgs, "path", ".");
    const { absolutePath } = resolveProjectPath(pathArg);
    const matches: string[] = [];

    await searchPath(absolutePath, query, matches);

    return matches.length > 0 ? matches.join("\n\n") : `No matches found for "${query}".`;
  } catch (error) {
    return `Error searching files: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function searchPath(
  absolutePath: string,
  query: string,
  matches: string[],
): Promise<void> {
  if (matches.length >= MAX_MATCHES) {
    return;
  }

  const fileStat = await stat(absolutePath);

  if (fileStat.isDirectory()) {
    const entries = await readdir(absolutePath, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= MAX_MATCHES || shouldIgnoreName(entry.name)) {
        continue;
      }

      await searchPath(path.join(absolutePath, entry.name), query, matches);
    }

    return;
  }

  if (!fileStat.isFile()) {
    return;
  }

  await searchFile(absolutePath, query, matches);
}

async function searchFile(
  absolutePath: string,
  query: string,
  matches: string[],
): Promise<void> {
  let content: string;

  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    return;
  }

  if (content.includes("\0")) {
    return;
  }

  const lines = content.split(/\r?\n/);
  const relativeFilePath = path.relative(process.cwd(), absolutePath);

  for (let index = 0; index < lines.length && matches.length < MAX_MATCHES; index += 1) {
    if (!lines[index].includes(query)) {
      continue;
    }

    const start = Math.max(0, index - CONTEXT_LINES);
    const end = Math.min(lines.length - 1, index + CONTEXT_LINES);
    const context = [];

    for (let lineIndex = start; lineIndex <= end; lineIndex += 1) {
      context.push(`${lineIndex + 1}: ${lines[lineIndex]}`);
    }

    matches.push(`${relativeFilePath}:${index + 1}\n${context.join("\n")}`);
  }
}
