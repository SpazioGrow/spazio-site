// Shared model-call helpers for the Content OS pipeline ONLY.
// Mirrors the inline patterns in app/api/generate-deck (Perplexity `sonar`,
// OpenAI gpt-4o JSON) so the A–I chain doesn't repeat fetch boilerplate across
// 5+ calls. Do NOT import these into the existing deck/brief/review routes.

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/** Strip ```json fences a model may wrap JSON in. */
export function stripFences(raw: string): string {
  let s = (raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  return s;
}

/** Parse model JSON defensively: strip fences, then fall back to the first {…}/[…] block. */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const s = stripFences(raw);
  try {
    return JSON.parse(s) as T;
  } catch {
    const m = s.match(/[{[][\s\S]*[\]}]/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Model did not return valid JSON");
  }
}

/** Perplexity research call. Model: PERPLEXITY_MODEL override, default `sonar`. Returns text. */
export async function runPerplexity(prompt: string, opts: { maxTokens?: number } = {}): Promise<string> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY not set");
  const model = process.env.PERPLEXITY_MODEL || "sonar";
  const res = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: opts.maxTokens ?? 1500,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** OpenAI chat completion forced to a JSON object; returns the parsed value. */
export async function runOpenAIJSON<T = unknown>(
  system: string,
  user: string,
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: user },
  ];
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model || "gpt-4o",
      response_format: { type: "json_object" },
      messages,
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text().catch(() => "")}`);
  const raw = (await res.json()).choices?.[0]?.message?.content ?? "{}";
  return parseJsonLoose<T>(raw);
}
