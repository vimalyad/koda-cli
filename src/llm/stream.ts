export interface StreamResult {
  text: string;
}

export async function collectTextStream(
  stream: AsyncIterable<{ text?: string }>,
): Promise<StreamResult> {
  let text = "";

  for await (const chunk of stream) {
    text += chunk.text ?? "";
  }

  return { text };
}
