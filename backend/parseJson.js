export function parseClaudeJson(text) {
  if (!text || !text.trim()) {
    throw new Error('Empty response from LLM');
  }

  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;

  return JSON.parse(jsonStr);
}
