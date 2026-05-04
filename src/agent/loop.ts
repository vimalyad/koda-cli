import type { FunctionCall, FunctionResponse } from "@google/genai";
import type { KodaConfig } from "../config.js";
import { createGeminiClient } from "../llm/client.js";
import { executeTool } from "../tools/executor.js";
import { listDirectoryTool } from "../tools/list-dir.js";
import { tools } from "../tools/registry.js";
import type { Renderer } from "../ui/renderer.js";
import { AgentContext } from "./context.js";
import { buildSystemPrompt } from "./system-prompt.js";

export async function runAgent(
  prompt: string,
  config: KodaConfig,
  renderer: Renderer,
  context = new AgentContext(),
): Promise<void> {
  if (!config.apiKey) {
    renderer.error("GEMINI_API_KEY is required.");
    return;
  }

  const client = createGeminiClient(config.apiKey);

  if (context.isEmpty()) {
    const initialDirectoryListing = await listDirectoryTool({});
    context.addUserText(`Current directory listing:\n${initialDirectoryListing}`);
  }

  context.addUserText(prompt);

  renderer.info(`Using ${config.model}`);
  renderer.debug(buildSystemPrompt());

  for (let iteration = 0; iteration < config.maxIterations; iteration += 1) {
    renderer.startThinking();

    try {
      const stream = await client.models.generateContentStream({
        model: config.model,
        contents: context.all(),
        config: {
          systemInstruction: buildSystemPrompt(),
          tools,
        },
      });

      const { functionCalls, text } = await readStream(stream, renderer);

      if (functionCalls.length === 0) {
        if (text.length > 0) {
          context.addModelText(text);
          renderer.newline();
        }

        return;
      }

      context.addModelFunctionCalls(functionCalls);
      context.addToolResponses(await executeFunctionCalls(functionCalls, config, renderer));
    } catch (error) {
      renderer.stopThinking();
      renderer.error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }

  renderer.error(
    "Reached max iterations. The task may be too complex - try breaking it into smaller steps.",
  );
}

async function readStream(
  stream: AsyncGenerator<{ text?: string; functionCalls?: FunctionCall[] }>,
  renderer: Renderer,
): Promise<{ functionCalls: FunctionCall[]; text: string }> {
  const functionCalls: FunctionCall[] = [];
  let text = "";
  let hasStoppedSpinner = false;

  for await (const chunk of stream) {
    const chunkFunctionCalls = chunk.functionCalls ?? [];

    if (chunkFunctionCalls.length > 0) {
      functionCalls.push(...chunkFunctionCalls);
      continue;
    }

    const chunkText = chunk.text ?? "";

    if (chunkText.length === 0) {
      continue;
    }

    if (!hasStoppedSpinner) {
      renderer.stopThinking();
      hasStoppedSpinner = true;
    }

    text += chunkText;
    renderer.streamText(chunkText);
  }

  if (!hasStoppedSpinner) {
    renderer.stopThinking();
  }

  return { functionCalls: dedupeFunctionCalls(functionCalls), text };
}

async function executeFunctionCalls(
  functionCalls: FunctionCall[],
  config: KodaConfig,
  renderer: Renderer,
): Promise<FunctionResponse[]> {
  const functionResponses: FunctionResponse[] = [];

  for (const functionCall of functionCalls) {
    const name = functionCall.name ?? "unknown_tool";
    renderer.toolCall(`${name}(${JSON.stringify(functionCall.args ?? {})})`);

    const output = await executeTool(name, functionCall.args ?? {}, {
      autoApprove: config.autoApprove,
      dryRun: config.dryRun,
    });

    renderer.toolResult(summarizeToolResult(output));
    functionResponses.push({
      id: functionCall.id,
      name,
      response: { output },
    });
  }

  return functionResponses;
}

function dedupeFunctionCalls(functionCalls: FunctionCall[]): FunctionCall[] {
  const seen = new Set<string>();
  const deduped: FunctionCall[] = [];

  for (const functionCall of functionCalls) {
    const key = functionCall.id ?? `${functionCall.name}:${JSON.stringify(functionCall.args ?? {})}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(functionCall);
  }

  return deduped;
}

function summarizeToolResult(output: string): string {
  const singleLine = output.replace(/\s+/g, " ").trim();

  if (singleLine.length <= 180) {
    return singleLine;
  }

  return `${singleLine.slice(0, 177)}...`;
}
