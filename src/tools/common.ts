import path from "node:path";

const DEFAULT_IGNORED_NAMES = new Set([
  ".git",
  ".idea",
  ".pnp",
  ".vscode",
  "dist",
  "node_modules",
  "out-tsc",
  "tmp",
]);

export interface PathResolution {
  absolutePath: string;
  relativePath: string;
}

export function resolveProjectPath(inputPath = "."): PathResolution {
  const root = process.cwd();
  const absolutePath = path.resolve(root, inputPath);
  const relativePath = path.relative(root, absolutePath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Path escapes project root: ${inputPath}`);
  }

  return {
    absolutePath,
    relativePath: relativePath || ".",
  };
}

export function shouldIgnoreName(name: string): boolean {
  return DEFAULT_IGNORED_NAMES.has(name);
}

export function asRecord(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Tool arguments must be an object.");
  }

  return args as Record<string, unknown>;
}

export function optionalString(
  args: Record<string, unknown>,
  key: string,
  defaultValue: string,
): string {
  const value = args[key];

  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value !== "string") {
    throw new Error(`Tool argument "${key}" must be a string.`);
  }

  return value;
}

export function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Tool argument "${key}" must be a non-empty string.`);
  }

  return value;
}
