import type { Content, FunctionCall, FunctionResponse } from "@google/genai";

export class AgentContext {
  private readonly history: Content[] = [];

  all(): Content[] {
    return this.history;
  }

  addUserText(text: string): void {
    this.history.push({ role: "user", parts: [{ text }] });
  }

  addModelText(text: string): void {
    this.history.push({ role: "model", parts: [{ text }] });
  }

  addModelFunctionCalls(functionCalls: FunctionCall[]): void {
    this.history.push({
      role: "model",
      parts: functionCalls.map((functionCall) => ({ functionCall })),
    });
  }

  addToolResponses(functionResponses: FunctionResponse[]): void {
    this.history.push({
      role: "user",
      parts: functionResponses.map((functionResponse) => ({ functionResponse })),
    });
  }
}
