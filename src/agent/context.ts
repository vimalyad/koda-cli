import type { Content } from "@google/genai";

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
}
