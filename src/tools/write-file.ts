import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { asRecord, requiredString, resolveProjectPath } from "./common.js";
import { confirmAction } from "./confirm.js";
import type { ToolExecutionOptions } from "./executor.js";

export async function writeFileTool(
  args: unknown,
  options: ToolExecutionOptions,
): Promise<string> {
  try {
    const parsedArgs = asRecord(args);
    const pathArg = requiredString(parsedArgs, "path");
    const content = requiredString(parsedArgs, "content");
    const { absolutePath, relativePath } = resolveProjectPath(pathArg);

    if (options.dryRun) {
      return `Dry run: would write ${content.length} characters to ${relativePath}.`;
    }

    const confirmed = await confirmAction(`? Write file: ${relativePath}`, options.autoApprove);

    if (!confirmed) {
      return `Write cancelled by user: ${relativePath}`;
    }

    await mkdir(path.dirname(absolutePath), { recursive: true });

    const tempPath = path.join(
      path.dirname(absolutePath),
      `.${path.basename(absolutePath)}.${process.pid}.${Date.now()}.tmp`,
    );

    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, absolutePath);

    return `Wrote ${content.length} characters to ${relativePath}.`;
  } catch (error) {
    return `Error writing file: ${error instanceof Error ? error.message : String(error)}`;
  }
}
