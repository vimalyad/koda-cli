import chalk from "chalk";
import ora, { type Ora } from "ora";

export interface Renderer {
  debug(message: string): void;
  error(message: string): void;
  info(message: string): void;
  newline(): void;
  startThinking(): void;
  stopThinking(): void;
  streamText(text: string): void;
  toolCall(message: string): void;
  toolResult(message: string): void;
}

export function createRenderer(): Renderer {
  let spinner: Ora | undefined;

  return {
    debug(message: string): void {
      if (process.env.KODA_DEBUG) {
        console.log(chalk.dim(message));
      }
    },
    error(message: string): void {
      console.error(chalk.red(message));
    },
    info(message: string): void {
      console.log(chalk.white(message));
    },
    newline(): void {
      console.log();
    },
    startThinking(): void {
      spinner = ora("Thinking...").start();
    },
    stopThinking(): void {
      spinner?.stop();
      spinner = undefined;
    },
    streamText(text: string): void {
      process.stdout.write(chalk.white(text));
    },
    toolCall(message: string): void {
      console.log(chalk.cyan(`> ${message}`));
    },
    toolResult(message: string): void {
      console.log(chalk.dim(message));
    },
  };
}
