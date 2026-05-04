import type { KodaConfig } from "../config.js";
import { createGeminiClient } from "../llm/client.js";
import type { Renderer } from "../ui/renderer.js";
import { AgentContext } from "./context.js";
import { buildSystemPrompt } from "./system-prompt.js";

export async function runAgent(
  prompt: string,
  config: KodaConfig,
  renderer: Renderer,
): Promise<void> {
  if (!config.apiKey) {
    renderer.error("GEMINI_API_KEY is required.");
    return;
  }

  const client = createGeminiClient(config.apiKey);
  const context = new AgentContext();
  context.addUserText(prompt);

  renderer.info(`Using ${config.model}`);
  renderer.debug(buildSystemPrompt());

  // The full agentic loop will be wired next. This scaffold proves the CLI,
  // config, client, and renderer boundaries are in place.
  void client;
  renderer.info("Agent loop scaffold is ready.");
}
