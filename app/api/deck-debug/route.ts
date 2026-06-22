// Mood-image debug endpoint — re-runs ONLY the image call for one report and
// returns OpenAI's raw status + body inline, so the DALL·E failure can be seen
// in the browser without hunting through Vercel logs.
//   GET /api/deck-debug?id=<reportId>
//
// Read-only against the pipeline: it reuses the exact same image request shape
// as generate-deck's generateVisual() but writes nothing back to Airtable.
// Unauthenticated but noindex; only exposes a boolean of which env keys exist
// (never their values) plus OpenAI's error text. Record IDs are unguessable.
// TEMP debug aid — safe to delete once mood images are confirmed working.

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";

// Mirror of generate-deck's generateVisual prompt wrapper, kept in sync by hand.
function moodPrompt(p: string): string {
  return `High-end brand mood board: ${p}. Abstract, atmospheric, no text, no logos, no people. Cinematic editorial photography. Premium design agency quality.`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";

  if (!id) return json({ error: "Missing report id (?id=…)." }, 400);

  const atToken = process.env.AIRTABLE_TOKEN;
  const oaiKey = process.env.OPENAI_API_KEY;

  const env = {
    AIRTABLE_TOKEN: Boolean(atToken),
    OPENAI_API_KEY: Boolean(oaiKey),
    OPENAI_API_KEY_prefix: oaiKey ? `${oaiKey.slice(0, 7)}…` : null,
  };
  if (!atToken) return json({ env, error: "AIRTABLE_TOKEN missing." }, 500);
  if (!oaiKey) return json({ env, error: "OPENAI_API_KEY missing — that alone explains empty mood images." }, 200);

  // 1. Pull section-11 mood prompts from the stored Deck JSON.
  let deckRaw = "";
  try {
    const rr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${id}`, {
      headers: { Authorization: `Bearer ${atToken}` },
    });
    if (!rr.ok) return json({ env, error: `Airtable ${rr.status}`, body: await rr.text().catch(() => "") }, 404);
    deckRaw = (await rr.json()).fields?.["Deck JSON"] || "";
  } catch (e) {
    return json({ env, error: "Could not reach Airtable.", detail: (e as Error).message }, 502);
  }
  if (!deckRaw) return json({ env, error: "Report has no Deck JSON yet (still generating?)." }, 404);

  let prompts: string[] = [];
  try {
    const deck = JSON.parse(deckRaw);
    const moodSlide = (deck?.slides || []).find((s: any) => s.section_number === 11);
    prompts = Array.isArray(moodSlide?.insights)
      ? moodSlide.insights.filter((p: unknown) => typeof p === "string" && (p as string).trim())
      : [];
  } catch (e) {
    return json({ env, error: "Deck JSON did not parse.", detail: (e as Error).message }, 200);
  }
  if (!prompts.length) {
    return json({ env, moodPromptsFound: 0, note: "Section 11 had no usable string prompts — nothing to send to DALL·E." }, 200);
  }

  // 2. Fire the exact same image request the pipeline uses — first prompt only.
  const promptUsed = prompts[0];
  const reqBody = { model: "dall-e-3", prompt: moodPrompt(promptUsed), n: 1, size: "1792x1024", quality: "standard" };

  let openai: Record<string, unknown>;
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${oaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });
    const text = await res.text();
    let imageUrl: string | null = null;
    if (res.ok) { try { imageUrl = JSON.parse(text).data?.[0]?.url ?? null; } catch { /* leave raw */ } }
    openai = {
      status: res.status,
      ok: res.ok,
      imageUrl,
      body: imageUrl ? "(ok — image url returned)" : text.slice(0, 2000),
    };
  } catch (e) {
    openai = { error: "fetch to OpenAI threw", detail: (e as Error).message };
  }

  return json({ env, reportId: id, moodPromptsFound: prompts.length, promptUsed, openai });
}
