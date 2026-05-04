import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface KodaConfig {
  apiKey?: string;
  model: string;
  autoApprove: boolean;
  dryRun: boolean;
  maxIterations: number;
}

interface FileConfig {
  model?: string;
  autoApprove?: boolean;
  maxIterations?: number;
}

interface CliOptions {
  model?: string;
  autoApprove?: boolean;
  dryRun?: boolean;
}

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_ITERATIONS = 20;

export async function loadConfig(options: CliOptions = {}): Promise<KodaConfig> {
  const fileConfig = await readFileConfig();

  return {
    apiKey: process.env.GEMINI_API_KEY,
    model: options.model ?? fileConfig.model ?? DEFAULT_MODEL,
    autoApprove: options.autoApprove ?? fileConfig.autoApprove ?? false,
    dryRun: options.dryRun ?? false,
    maxIterations: fileConfig.maxIterations ?? DEFAULT_MAX_ITERATIONS,
  };
}

async function readFileConfig(): Promise<FileConfig> {
  const configPath = path.join(homedir(), ".koda", "config.json");

  try {
    await access(configPath, constants.R_OK);
    return JSON.parse(await readFile(configPath, "utf8")) as FileConfig;
  } catch {
    return {};
  }
}
