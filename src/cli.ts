import { Command } from "commander";
import { runAgent } from "./agent/loop.js";
import { loadConfig } from "./config.js";
import { createRenderer } from "./ui/renderer.js";

export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command();

  program
    .name("koda")
    .description("Gemini-powered coding assistant for your terminal")
    .argument("[prompt...]", "Task for koda to complete")
    .option("--auto-approve", "Skip confirmation prompts for tool actions")
    .option("--dry-run", "Show tool calls without executing writes or commands")
    .option("--model <model>", "Override the Gemini model")
    .action(async (promptParts: string[], options) => {
      const config = await loadConfig(options);
      const renderer = createRenderer();
      const prompt = promptParts.join(" ").trim();

      if (!prompt) {
        program.help();
        return;
      }

      await runAgent(prompt, config, renderer);
    });

  program
    .command("chat")
    .description("Start an interactive koda session")
    .option("--auto-approve", "Skip confirmation prompts for tool actions")
    .option("--dry-run", "Show tool calls without executing writes or commands")
    .option("--model <model>", "Override the Gemini model")
    .action(async () => {
      const renderer = createRenderer();
      renderer.info("Interactive chat mode is scaffolded but not implemented yet.");
    });

  await program.parseAsync(argv);
}
