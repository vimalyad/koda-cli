import { exec } from "node:child_process";
import { asRecord, requiredString } from "./common.js";
import { confirmAction } from "./confirm.js";
import type { ToolExecutionOptions } from "./executor.js";

const COMMAND_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_BUFFER = 1024 * 1024;
const DESTRUCTIVE_COMMAND_PATTERN = /(^|\s)(rm|rmdir|del|erase|rd)(\s|$)/i;

export async function runCommandTool(
  args: unknown,
  options: ToolExecutionOptions,
): Promise<string> {
  try {
    const command = requiredString(asRecord(args), "command");

    if (DESTRUCTIVE_COMMAND_PATTERN.test(command)) {
      return `Command rejected because destructive delete commands are not allowed: ${command}`;
    }

    if (options.dryRun) {
      return `Dry run: would run command: ${command}`;
    }

    const confirmed = await confirmAction(`? Run command: ${command}`, options.autoApprove);

    if (!confirmed) {
      return `Command cancelled by user: ${command}`;
    }

    return await executeCommand(command);
  } catch (error) {
    return `Error running command: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function executeCommand(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(
      command,
      {
        cwd: process.cwd(),
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BUFFER,
      },
      (error, stdout, stderr) => {
        const combinedOutput = [stdout, stderr].filter(Boolean).join("");

        if (error) {
          const timeoutMessage = error.killed
            ? `Command timed out after ${COMMAND_TIMEOUT_MS / 1000} seconds.\n`
            : "";
          resolve(`${timeoutMessage}${combinedOutput}${error.message}`.trim());
          return;
        }

        resolve(combinedOutput.trim() || "(command completed with no output)");
      },
    );
  });
}
