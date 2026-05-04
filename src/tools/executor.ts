export interface ToolExecutionOptions {
  autoApprove: boolean;
  dryRun: boolean;
}

export async function executeTool(
  name: string,
  args: unknown,
  _options: ToolExecutionOptions,
): Promise<string> {
  return `Tool ${name} is registered but not implemented yet. Args: ${JSON.stringify(args)}`;
}
