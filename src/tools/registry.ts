import { Type, type Tool } from "@google/genai";

export const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "read_file",
        description: "Read the full contents of a file at the given path",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description: "File path relative to current directory",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file using an atomic temp-file rename",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description: "File path relative to current directory",
            },
            content: {
              type: Type.STRING,
              description: "Full file contents to write",
            },
          },
          required: ["path", "content"],
        },
      },
      {
        name: "run_command",
        description: "Run a shell command in the current project directory",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: {
              type: Type.STRING,
              description: "Shell command to run",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "list_directory",
        description: "List files and directories at a path under the project root",
        parameters: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.STRING,
              description: "Directory path relative to current directory",
            },
          },
        },
      },
      {
        name: "search_in_files",
        description: "Search for a string or pattern across project files",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "Text or pattern to search for",
            },
            path: {
              type: Type.STRING,
              description: "Directory path relative to current directory",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];
