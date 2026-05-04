import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function confirmAction(prompt: string, autoApprove: boolean): Promise<boolean> {
  if (autoApprove) {
    return true;
  }

  if (!input.isTTY || !output.isTTY) {
    return false;
  }

  const readline = createInterface({ input, output });

  try {
    const answer = await readline.question(`${prompt} [y/N] `);
    return answer.trim().toLowerCase() === "y";
  } finally {
    readline.close();
  }
}
