import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Command } from "commander";
import { AgentContext } from "./agent/context.js";
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
    .action(async (options) => {
      const config = await loadConfig(options);
      const renderer = createRenderer();
      const context = new AgentContext();
      const readline = createInterface({ input, output });

      renderer.info("koda chat started. Type /exit to quit.");

      try {
        for (;;) {
          const prompt = (await readline.question("koda> ")).trim();

          if (prompt.length === 0) {
            continue;
          }

          if (prompt === "/exit" || prompt === "/quit") {
            break;
          }

          await runAgent(prompt, config, renderer, context);
        }
      } finally {
        readline.close();
      }
    });

  await program.parseAsync(argv);
}
