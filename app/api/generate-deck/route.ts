// Generate Deck — AI brand audit pipeline
// Perplexity research -> GPT-4o 13-section brand audit (JSON, generated in two batches) -> DALL·E mood images
// Stores: readable HTML preview (Brief HTML) + raw JSON (Deck JSON, for Plus AI) + images
// Then creates an Asana review task. Final deck is built in Plus AI / Google Slides.

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";
const IMG_FIELD = "fldPVXauT9v4GqVZm";
const REPORT_FIELDS = { status: "fldLUKmsHhqidDFWb", briefHTML: "fld3ZgwxOlFRK27Qx" } as const;
// NEW: create a long-text field named exactly "Deck JSON" in the Brand Intelligence Reports table.
const DECK_JSON_FIELD = "Deck JSON";

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// === PERPLEXITY: RESEARCH ===
async function runResearch(company: string, service: string, answers: string, links: string, key: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: `You are a senior brand researcher. Research "${company}" (${service}).

Brand website / socials: ${links || "(none provided)"}
Client intake: ${answers}

Deliver a concise research dossier covering: industry size and growth (with figures), category trends, 4-5 named competitors (direct + aspirational) with visual + strategic strengths/weaknesses, target audience profile, brand positioning opportunity, and the visual landscape (overused vs. fresh). ~700 words. Use real names and numbers, and cite sources inline. Mark inferences [Inferred].` }], max_tokens: 1800 }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

const AUDIT_SYS = "You are a senior brand strategist, creative director, and research analyst at the level of Pentagram, Wolff Olins, and BCG. You produce sharp, opinionated brand audits — never neutral, never generic. Return ONLY a valid JSON object. No markdown, no backticks, no commentary.";

const SLIDE_SCHEMA = `Each slide object: { "section_number": N, "title": "string", "headline_insight": "one sharp sentence", "insights": ["string","string","string"], "analysis": "2-4 sentence senior narrative", "recommendations": ["string"], "visual": { "type": "chart|table|diagram|framework|scorecard|image_prompt|palette", "title": "string", "description": "what it shows and how to lay it out", "data": {} }, "key_metric": { "value": "string", "label": "string", "source": "from RESEARCH or empty" }, "speaker_notes": "2-3 sentences", "sources": [ { "claim": "string", "source": "from RESEARCH only" } ] }`;

const BATCH_A_SECTIONS = `1 Executive Summary — what the brand is today, key issues, key opportunities, a sharp 1-2 sentence diagnosis. ALSO set the top-level "brand_assessment_score" (X/100).
2 Brand Overview — mission (infer if missing), offerings, market category, reconstructed positioning statement.
3 Audience Analysis — primary + secondary personas; for each: pain points, jobs-to-be-done, emotional drivers, purchase triggers.
4 Market Research &
