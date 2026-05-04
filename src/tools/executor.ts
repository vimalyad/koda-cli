import { listDirectoryTool } from "./list-dir.js";
import { readFileTool } from "./read-file.js";
import { runCommandTool } from "./run-command.js";
import { searchInFilesTool } from "./search.js";
import { writeFileTool } from "./write-file.js";

export interface ToolExecutionOptions {
  autoApprove: boolean;
  dryRun: boolean;
}

export async function executeTool(
  name: string,
  args: unknown,
  options: ToolExecutionOptions,
): Promise<string> {
  switch (name) {
    case "read_file":
      return readFileTool(args);
    case "list_directory":
      return listDirectoryTool(args);
    case "search_in_files":
      return searchInFilesTool(args);
    case "write_file":
      return writeFileTool(args, options);
    case "run_command":
      return runCommandTool(args, options);
    default:
      return `Unknown tool: ${name}`;
  }
}
