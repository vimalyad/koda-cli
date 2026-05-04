# koda — Gemini-Powered Coding CLI Agent
## Codex Build Prompt

---

## Project Overview

Build a TypeScript CLI tool called `koda` — an agentic coding assistant powered by Google's Gemini API. It works like Claude Code or OpenAI Codex CLI: the user runs a command, the AI reads their codebase, reasons about it, calls tools (read file, write file, run commands), and completes the task autonomously in a loop.

Users bring their own Gemini API key (set as `GEMINI_API_KEY` env var). No backend, no auth, no rate limiting needed — calls go directly from the user's machine to Google's API.

---

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 18+
- **LLM SDK:** `@google/genai` (the new unified Google GenAI SDK)
- **Model:** `gemini-2.0-flash` (default — free tier, fast, 1M context)
- **CLI framework:** `commander`
- **Terminal output:** `chalk` for colors, `ora` for spinners
- **Build/Dev:** `tsx` for development, `esbuild` for production build
- **Package manager:** `npm`

---

## Project Structure

```
koda/
├── src/
│   ├── cli.ts                   # Entry point — argument parsing, mode routing
│   ├── agent/
│   │   ├── loop.ts              # Core agentic loop
│   │   ├── context.ts           # Conversation history management
│   │   └── system-prompt.ts     # System prompt builder
│   ├── tools/
│   │   ├── registry.ts          # Gemini function declarations (tool schemas)
│   │   ├── executor.ts          # Routes tool name → implementation
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── run-command.ts
│   │   ├── list-dir.ts
│   │   └── search.ts
│   ├── llm/
│   │   ├── client.ts            # Gemini client initialization
│   │   └── stream.ts            # Stream response handler
│   ├── ui/
│   │   └── renderer.ts          # Terminal rendering (chalk + ora)
│   └── config.ts                # Config loader (env vars, defaults)
├── package.json
├── tsconfig.json
└── README.md
```

---

## How The Agent Works — Implement Exactly This

### The Agentic Loop (Most Important Part)

The loop in `agent/loop.ts` must follow this exact flow:

```
1. Take user prompt + existing history
2. Append user message to history
3. Send full history + tool definitions to Gemini
4. Receive response — it's either:
   a. A text response   → stream to terminal → done
   b. A function call   → execute the tool → append result to history → go to step 3
5. Guard: if iteration count exceeds 20, stop and tell the user
```

This loop continues until Gemini returns a pure text response with no tool calls. That signals the task is complete.

### History Format for Gemini

Gemini's `@google/genai` SDK uses `Content[]` for history. Each entry has a `role` ("user" or "model") and `parts` array. Tool calls and tool results are both represented as parts within this structure:

- User message: `{ role: "user", parts: [{ text: "..." }] }`
- Model text: `{ role: "model", parts: [{ text: "..." }] }`
- Model tool call: `{ role: "model", parts: [{ functionCall: { name, args } }] }`
- Tool result: `{ role: "user", parts: [{ functionResponse: { name, response } }] }`

Always send the **complete history** with every request. Gemini has no memory between calls.

### Streaming

Use Gemini's streaming API (`generateContentStream`). Stream text tokens to the terminal in real time as they arrive. When a `functionCall` part is detected in the stream, stop streaming text, execute the tool, and continue the loop.

---

## Tools To Implement

### 1. `read_file`
- Reads a file at a given path and returns its contents as a string
- Handle errors gracefully — return an error string, don't throw (the model needs to see the error to recover)
- Always resolve paths relative to `process.cwd()`

### 2. `write_file`
- Writes content to a file path
- Create parent directories if they don't exist (`mkdir -p` equivalent)
- **Safety:** Write to a `.tmp` file first, then rename to final path — prevents partial/corrupted writes if process dies
- Show a confirmation prompt to the user before writing if `--auto-approve` flag is not set

### 3. `run_command`
- Execute a shell command, capture stdout and stderr, return combined output
- Set a timeout of 15 seconds
- Run in `process.cwd()` as working directory
- **Safety:** ALWAYS show the command to the user and ask for confirmation before running — unless `--auto-approve` flag is set
- Return both stdout and stderr so the model can see failures

### 4. `list_directory`
- List files and subdirectories at a given path
- Show `[dir]` or `[file]` prefix for each entry
- Default to `.` if no path given
- Respect `.gitignore` — skip `node_modules`, `.git`, `dist` etc.

### 5. `search_in_files`
- Search for a string/pattern across files in a directory
- Return matching file paths + line numbers + surrounding line context
- Use Node.js `fs` APIs — no external dependencies required
- Limit results to 50 matches to avoid flooding the context

---

## Tool Schema Format (Gemini-Specific)

Register all tools in `tools/registry.ts` as a `Tool[]` array for the `@google/genai` SDK:

```typescript
[{
  functionDeclarations: [
    {
      name: "read_file",
      description: "Read the full contents of a file at the given path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to current directory" }
        },
        required: ["path"]
      }
    },
    // ... other tools
  ]
}]
```

Write descriptions carefully — Gemini uses them to decide which tool to call. Be specific.

---

## System Prompt

Build the system prompt dynamically in `agent/system-prompt.ts`. It must include:

1. The agent's role: "You are koda, an expert coding assistant running in the user's terminal with access to their filesystem and shell."
2. Working directory: inject `process.cwd()` so the model knows where it is
3. OS info: inject `process.platform`
4. Project type detection: if `package.json` exists → "Node.js project", if `pyproject.toml` → "Python project", etc.
5. Behavioral rules:
    - Always read a file before editing it
    - Never delete files (no `rm` commands)
    - Prefer small, focused changes over full rewrites
    - When uncertain, ask the user rather than guessing
    - After completing a task, summarize what was done

---

## CLI Interface

### Commands

```bash
# One-shot mode
koda "add error handling to src/api.ts"

# Interactive REPL mode
koda chat

# With flags
koda "run tests" --auto-approve       # skip confirmation prompts
koda "refactor auth" --dry-run        # show what would happen, don't execute
koda "fix bug" --model gemini-2.5-pro # override model
```

### Config File

Read from `~/.koda/config.json` if it exists. Supported fields:
- `model` — default model to use
- `autoApprove` — skip confirmations
- `maxIterations` — max tool call loop iterations (default: 20)

CLI flags override config file values.

---

## Terminal UI Behavior

- **Spinner:** Show while waiting for Gemini response (`⠋ Thinking...`)
- **Tool call display:** When a tool is called, print it clearly before executing:
  ```
  ◆ read_file("src/auth.ts")
  ◆ run_command("npm test")  ← requires confirmation
  ```
- **Confirmation prompt:** For `write_file` and `run_command`, show:
  ```
  ? Run command: npm test  [y/N]
  ```
- **Streaming:** Text response streams character by character — no buffering
- **Colors:**
    - Tool calls → cyan
    - Tool results (summary) → dim/gray
    - Final answer → white
    - Errors → red
    - Confirmations → yellow

---

## Critical Safety Rules — Must Implement

1. **Max iterations guard:** If the loop exceeds 20 tool calls without a final text response, stop and print: "Reached max iterations. The task may be too complex — try breaking it into smaller steps."

2. **Confirmation before write/run:** Never execute `write_file` or `run_command` without showing the user what will happen and getting a `y` confirmation — unless `--auto-approve` is explicitly set.

3. **No delete commands:** The system prompt should explicitly tell the model never to use `rm`, `rmdir`, or any destructive commands.

4. **Path safety:** Resolve all file paths relative to `process.cwd()`. Reject paths that try to escape with `../../../` outside the project root.

5. **Timeout on commands:** Never let a shell command run more than 15 seconds. Kill the process and return a timeout error to the model.

6. **Atomic writes:** Always use temp file + rename for `write_file`.

---

## Context Window Strategy

Gemini 2.0 Flash has a 1M token window which is huge, but still manage it:

- Don't pre-load files upfront — let the model call `read_file` lazily as needed
- Start each session with only: system prompt + directory listing of `process.cwd()`
- If history exceeds 800K tokens, summarize the oldest 50% of messages into a single summary message and drop the originals
- Always keep the last 10 exchanges verbatim regardless of summarization

---

## Error Handling Philosophy

- Tool errors should NEVER crash the CLI — return error strings to the model so it can recover and try a different approach
- LLM API errors (rate limit, network) should be caught, displayed to the user, and allow retry
- Invalid tool arguments from the model should return a descriptive error string explaining what was wrong

---

## Package.json Requirements

```json
{
  "name": "koda",
  "version": "0.1.0",
  "description": "Gemini-powered coding assistant for your terminal",
  "bin": { "koda": "./dist/cli.js" },
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "esbuild src/cli.ts --bundle --platform=node --outfile=dist/cli.js",
    "start": "node dist/cli.js"
  }
}
```

The `bin` field is critical — it's what makes `koda` work as a global CLI command after `npm install -g`.

---

## Git Commit Strategy — Must Follow Throughout Development

Every meaningful change must be committed with a proper git commit message. The goal is a git history that reads like a human developer's diary — not a changelog, not a ticket system.

### Rules

**No conventional commit prefixes.** Never use `feat:`, `fix:`, `chore:`, `refactor:` etc. These are robotic and hard to read at a glance.

**Write in plain past tense.** Describe what changed and why, like you're telling a teammate what you did.

**Subject line:** Max 72 characters. Specific enough that someone reading `git log` understands what happened without opening the diff.

**Body (when needed):** Add a blank line after the subject, then explain the *why* — context that isn't obvious from the code. Not required for every commit, only when the reason behind a change isn't self-evident.

### Good vs Bad Examples

```
# Bad — robotic prefixes
feat: add read_file tool
fix: handle undefined path in executor
chore: update dependencies
refactor: extract streaming logic

# Good — human, descriptive
Added read_file tool with graceful error handling
Fixed crash when model passes undefined path to executor
Switched from axios to native fetch to reduce bundle size
Pulled streaming logic into its own module to simplify the loop
```

More examples of the right tone:
```
Wired up the agentic loop end to end — one-shot mode now works
Added confirmation prompt before writing files or running commands
Capped tool call iterations at 20 to prevent runaway loops
Made write_file atomic using temp file rename to avoid partial writes
Hooked up chalk colors — tool calls cyan, errors red, answers white
Pushed first working version of koda chat (REPL mode)
Cleaned up path resolution so relative paths always anchor to cwd
```

### When To Commit

Commit after each logical unit of work — not after every file save, not after the entire feature. A good rule: if you can describe what you just did in one clear sentence, it's time to commit.

Suggested commit points during this build:
- After project scaffold and package.json is set up
- After Gemini client is wired and can make a basic call
- After each tool is implemented and manually tested
- After the agentic loop runs end to end for the first time
- After confirmation prompts are working
- After streaming is hooked up
- After REPL mode works
- After safety guards (max iterations, path checks) are in place
- Before any significant refactor

---

## What NOT To Build (Yet)

- No backend server
- No authentication system
- No user accounts or API key management
- No telemetry or usage tracking
- No plugin system
- No multi-file diffs (just direct writes for now)
- No web UI

Keep it simple. A focused, working CLI is better than a complex broken one.

---

## Definition of Done for MVP

- [ ] `koda "describe this project"` works end to end
- [ ] Model can read files, list directories, and stream a response
- [ ] `koda "add a hello world route to index.ts"` reads the file, writes the change, shows confirmation
- [ ] `--dry-run` shows tool calls without executing them
- [ ] `koda chat` opens an interactive session with history
- [ ] Errors from tools are shown to the model and it recovers gracefully
- [ ] Max iterations guard prevents infinite loops
- [ ] Publishes correctly with `npm pack` (bin works after global install)