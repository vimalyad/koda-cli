import { listDirectoryTool } from "./list-dir.js";
import { readFileTool } from "./read-file.js";
import { searchInFilesTool } from "./search.js";

export interface ToolExecutionOptions {
  autoApprove: boolean;
  dryRun: boolean;
}

export async function executeTool(
  name: string,
  args: unknown,
  _options: ToolExecutionOptions,
): Promise<string> {
  switch (name) {
    case "read_file":
      return readFileTool(args);
    case "list_directory":
      return listDirectoryTool(args);
    case "search_in_files":
      return searchInFilesTool(args);
    case "write_file":
    case "run_command":
      return `Tool ${name} is registered but not implemented yet. Args: ${JSON.stringify(args)}`;
    default:
      return `Unknown tool: ${name}`;
  }
}
