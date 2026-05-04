import { readFile } from "node:fs/promises";
import { asRecord, requiredString, resolveProjectPath } from "./common.js";

export async function readFileTool(args: unknown): Promise<string> {
  try {
    const pathArg = requiredString(asRecord(args), "path");
    const { absolutePath } = resolveProjectPath(pathArg);

    return await readFile(absolutePath, "utf8");
  } catch (error) {
    return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
  }
}
