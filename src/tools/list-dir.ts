import { readdir } from "node:fs/promises";
import { asRecord, optionalString, resolveProjectPath, shouldIgnoreName } from "./common.js";

export async function listDirectoryTool(args: unknown): Promise<string> {
  try {
    const pathArg = optionalString(asRecord(args ?? {}), "path", ".");
    const { absolutePath } = resolveProjectPath(pathArg);
    const entries = await readdir(absolutePath, { withFileTypes: true });

    const visibleEntries = entries
      .filter((entry) => !shouldIgnoreName(entry.name))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      })
      .map((entry) => `${entry.isDirectory() ? "[dir]" : "[file]"} ${entry.name}`);

    return visibleEntries.length > 0 ? visibleEntries.join("\n") : "(empty directory)";
  } catch (error) {
    return `Error listing directory: ${error instanceof Error ? error.message : String(error)}`;
  }
}
