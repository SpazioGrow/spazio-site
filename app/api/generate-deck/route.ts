// Generate Deck — AI brand audit pipeline
// Perplexity research -> GPT-4o 13-section brand audit (JSON, two parallel batches)
// -> DALL·E mood images -> stores visual Brief HTML + Deck JSON + image attachments
// in Airtable, then creates an Asana review task.
import { renderAuditHTML } from "@/lib/deck-render";

// This is the heavy pipeline (research + 2 GPT-4o calls + image generation). Without
// an explicit maxDuration it was being killed at Vercel's default (~15s), which
// truncated batch B (section 11) and the mood images. Give it real headroom.
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";
const IMG_FIELD = "fldPVXauT9v4GqVZm";
const REPORT_FIELDS = { status: "fldLUKmsHhqidDFWb", briefHTML: "fld3ZgwxOlFRK27Qx" } as const;
// A long-text field named exactly "Deck JSON" in the Brand Intelligence Reports table.
const DECK_JSON_FIELD = "Deck JSON";

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
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text().catch(() => "")}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

const AUDIT_SYS = "You are a senior brand strategist, creative director, and research analyst at the level of Pentagram, Wolff Olins, and BCG. You produce sharp, opinionated brand audits — never neutral, never generic. Return ONLY a valid JSON object. No markdown, no backticks, no commentary.";

// The visual is RENDERED as a real graphic from visual.data — so data must match the
// shape for its type exactly. Empty/freeform data renders nothing, so never leave it blank.
const SLIDE_SCHEMA = `Each slide object:
{ "section_number": N, "title": "string", "headline_insight": "one sharp sentence",
  "insights": ["string","string","string"], "analysis": "2-4 sentence senior narrative",
  "recommendations": ["string"],
  "visual": { "type": "<one of the types below>", "title": "string", "data": { ...shape for that type... } },
  "key_metric": { "value": "string", "label": "string", "source": "from RESEARCH or empty" },
  "speaker_notes": "2-3 sentences", "sources": [ { "claim": "string", "source": "from RESEARCH only" } ] }

visual.type MUST be one of these, and visual.data MUST match its shape EXACTLY with real values
(these are drawn as live graphics — never leave data empty, never put a hex or font name in prose):
- "chart":       { "labels": ["..."], "values": [number,...], "unit": "" }        // bar chart of real figures
- "table":       { "columns": ["..."], "rows": [["...","..."], ["...","..."]] }
- "scorecard":   { "items": [ { "label": "", "score": number, "max": 100 } ] }
- "palette":     { "swatches": [ { "name": "", "hex": "#RRGGBB" } ] }
- "positioning": { "x_axis": "", "y_axis": "", "points": [ { "label": "", "x": 0-100, "y": 0-100 } ] }
- "matrix":      same shape as positioning (used for impact vs effort)
- "roadmap":     { "phases": [ { "name": "", "items": ["",""] } ] }
- "diagram":     { "steps": ["","",""] }                                          // also for "framework"
- "image_prompt": section 11 ONLY — put 6-8 DALL-E prompt strings in "insights"; data may be {}`;

const BATCH_A_SECTIONS = `1 Executive Summary — what the brand is today, key issues, opportunities, a sharp 1-2 sentence diagnosis. ALSO set top-level "brand_assessment_score" (X/100). visual type "scorecard" rating Strategy/Identity/Messaging/Consistency.
2 Brand Overview — mission (infer if missing), offerings, market category, reconstructed positioning statement. visual type "diagram" (data.steps = the offering/value flow).
3 Audience Analysis — primary + secondary personas; pain points, jobs-to-be-done, emotional drivers, purchase triggers. visual type "table" (columns = Persona, Pains, JTBD, Triggers).
4 Market Research & Intelligence — trends, category evolution, white space; CITE real RESEARCH sources. visual type "chart" (data.values = a real market figure over time/segments).
5 Competitor Benchmarking — direct + aspirational competitors; strengths/failures; CITE. visual type "table" (columns = Brand, Strength, Weakness).
6 Brand Positioning — current / perceived / ideal + gap analysis. visual type "positioning" (2x2, plot the brand + competitors as points).
7 Visual Identity Benchmarking — category visual standards: table-stakes, overused, what would feel fresh. visual type "table" (columns = Table-stakes, Overused, Fresh).`;

const BATCH_B_SECTIONS = `8 Visual Identity Audit — logo, typography, color psychology, design-system maturity, consistency. visual type "scorecard" (items scored /100).
9 Messaging & Tone Audit — clarity, consistency, emotional resonance; evaluate or propose a tagline. visual type "table" (columns = Dimension, Today, Recommended).
10 Creative Direction — moodboard description, style references, typography direction, personality keywords, and a color palette. visual type "palette" (data.swatches with real hex codes).
11 Visual Moodboard — put 6-8 DALL-E image prompts as separate plain strings in "insights" (abstract, atmospheric, no text, no logos, no people). visual type "image_prompt".
12 Strategic Recommendations — ranked by priority. visual type "matrix" (impact vs effort; plot each recommendation as a point).
13 Next Steps — immediate actions, strategic priorities, Spazio deliverables; close toward a full brand-system engagement. visual type "roadmap" (3 phases with items).`;

// === OPENAI: one batch of audit sections ===
async function generateAuditBatch(company: string, service: string, research: string, answers: string, links: string, key: string, sections: string, wantMeta: boolean) {
  const metaLine = wantMeta ? `"deck_title": "string", "brand_assessment_score": "X/100", ` : "";
  const user = `Generate ONLY the listed sections of a brand audit deck for "${company}" (${service}).

RESEARCH DOSSIER (ground ALL market and competitor facts in this; cite its sources; NEVER invent a statistic or source):
${research || "(no research available — infer from category knowledge and tag [Assumption])"}

CLIENT FORM ANSWERS:
${answers}

WEBSITE & SOCIAL LINKS (base the visual, messaging, and perceived-positioning audit on what is actually here; if empty, assess typical category issues and tag [Assumption]):
${links || "(none provided)"}

RULES:
- Never leave a section empty: each slide needs a title + at least 3 substantive insights + a populated visual.
- visual.data MUST be filled with the exact shape for visual.type (real numbers/values) — it is rendered as a live graphic.
- Infer where data is missing and tag inline with [Assumption]. Be opinionated and specific.
- Market Research and Competitor slides MUST carry real sources drawn from RESEARCH. Do not fabricate.

Return a JSON object: { ${metaLine}"slides": [ ... ] }
${SLIDE_SCHEMA}

GENERATE EXACTLY THESE SECTIONS, IN ORDER (use the given section_number for each):
${sections}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: AUDIT_SYS }, { role: "user", content: user }],
      max_tokens: 8000, temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const raw = (await res.json()).choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); }
  catch (e) { console.error("[deck] audit batch JSON parse failed:", (e as Error).message, "raw head:", raw.slice(0, 300)); return null; }
}

// === Orchestrate: two batches in parallel, then merge ===
async function generateAuditDeck(company: string, service: string, research: string, answers: string, links: string, key: string) {
  const [a, b] = await Promise.all([
    generateAuditBatch(company, service, research, answers, links, key, BATCH_A_SECTIONS, true).catch((e) => { console.error("[deck] batch A failed:", e?.message || e); return null; }),
    generateAuditBatch(company, service, research, answers, links, key, BATCH_B_SECTIONS, false).catch((e) => { console.error("[deck] batch B failed:", e?.message || e); return null; }),
  ]);
  if (!a) console.warn("[deck] batch A (sections 1-7) returned nothing");
  if (!b) console.warn("[deck] batch B (sections 8-13) returned nothing — section 11/mood images will be absent");
  if (!a && !b) return null;
  const slides = [...((a?.slides as any[]) || []), ...((b?.slides as any[]) || [])]
    .filter(Boolean)
    .sort((x: any, y: any) => (x.section_number || 0) - (y.section_number || 0));
  return {
    deck_title: a?.deck_title || `${company || "Brand"} — Brand Audit`,
    brand_assessment_score: a?.brand_assessment_score || "",
    slides,
  };
}

// === DALL·E ===
async function generateVisual(prompt: string, key: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt: `High-end brand mood board: ${prompt}. Abstract, atmospheric, no text, no logos, no people. Cinematic editorial photography. Premium design agency quality.`, n: 1, size: "1792x1024", quality: "standard" }),
  });
  if (!res.ok) throw new Error(`DALL-E ${res.status}: ${await res.text().catch(() => "")}`);
  return (await res.json()).data?.[0]?.url ?? "";
}

export async function POST(request: Request) {
  const atToken = process.env.AIRTABLE_TOKEN;
  const pplxKey = process.env.PERPLEXITY_API_KEY;
  const oaiKey = process.env.OPENAI_API_KEY;
  const asanaToken = process.env.ASANA_TOKEN;
  if (!atToken) return Response.json({ error: "Not configured." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const reportId = typeof body.reportId === "string" ? body.reportId : "";
  if (!reportId) return Response.json({ error: "Missing reportId." }, { status: 400 });

  const atHeaders = { Authorization: `Bearer ${atToken}`, "Content-Type": "application/json" };

  // === FETCH DATA ===
  let company = "", service = "", email = "", name = "", links = "", answers = "{}";
  try {
    const rr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${reportId}`, { headers: { Authorization: `Bearer ${atToken}` } });
    if (rr.ok) {
      const rd = await rr.json();
      answers = rd.fields?.["Answers"] || "{}";
      const lid = (rd.fields?.["Lead"] || [])[0];
      if (lid) {
        const lr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}/${lid}`, { headers: { Authorization: `Bearer ${atToken}` } });
        if (lr.ok) {
          const ld = await lr.json();
          name = ld.fields?.["Name"] || "";
          company = ld.fields?.["Company "] || ld.fields?.["Company"] || "";
          email = ld.fields?.["Email "] || ld.fields?.["Email"] || "";
          links = ld.fields?.["Website"] || ld.fields?.["Website "] || ld.fields?.["Website / Socials"] || "";
          const svc = ld.fields?.["Service Interest"];
          service = typeof svc === "object" && svc?.name ? svc.name : (typeof svc === "string" ? svc : "");
        }
      }
    }
  } catch (e) { console.error("Fetch failed", e); }

  // === 1. RESEARCH ===
  let research = "";
  if (pplxKey) { try { research = await runResearch(company, service, answers, links, pplxKey); } catch (e) { console.error("[deck] research failed:", (e as Error).message); } }
  else console.warn("[deck] PERPLEXITY_API_KEY missing — skipping research");

  // === 2. BRAND AUDIT (13 sections, two batches) ===
  let audit: any = null;
  if (oaiKey) { try { audit = await generateAuditDeck(company, service, research, answers, links, oaiKey); } catch (e) { console.error("[deck] audit failed:", (e as Error).message); } }
  else console.warn("[deck] OPENAI_API_KEY missing — skipping audit");

  const sectionNums = (audit?.slides || []).map((s: any) => s.section_number);
  console.log(`[deck] audit: ${sectionNums.length} sections present [${sectionNums.join(",")}], score=${audit?.brand_assessment_score || "n/a"}`);

  // === 3. MOOD IMAGES (from section 11 prompts) ===
  const moodSlide = (audit?.slides || []).find((s: any) => s.section_number === 11);
  if (!moodSlide) console.warn("[deck] section 11 (moodboard) MISSING — batch B likely failed/timed out; no mood images");
  const moodPrompts: string[] = Array.isArray(moodSlide?.insights)
    ? moodSlide.insights.filter((p: unknown) => typeof p === "string" && p.trim()).slice(0, 4)
    : [];
  if (moodSlide) console.log(`[deck] mood prompts: ${moodPrompts.length} usable (raw insights=${(moodSlide.insights || []).length}, types=[${(moodSlide.insights || []).map((p: unknown) => typeof p).join(",")}])`);

  let imageUrls: string[] = [];
  if (oaiKey && moodPrompts.length) {
    imageUrls = await Promise.all(moodPrompts.map(async (p) => {
      try { return await generateVisual(p, oaiKey); }
      catch (e) { console.error("[deck] DALL-E image failed:", (e as Error).message, "| prompt:", String(p).slice(0, 90)); return ""; }
    }));
  }
  console.log(`[deck] mood images generated: ${imageUrls.filter(Boolean).length}/${moodPrompts.length}`);

  // === 4. PERMANENT IMAGE STORAGE ===
  let permanentUrls: string[] = [];
  const validUrls = imageUrls.filter(Boolean);
  if (validUrls.length) {
    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
        method: "PATCH", headers: atHeaders,
        body: JSON.stringify({ records: [{ id: reportId, fields: { [IMG_FIELD]: validUrls.map(url => ({ url })) } }] }),
      });
      if (res.ok) {
        const data = await res.json();
        permanentUrls = (data.records?.[0]?.fields?.[IMG_FIELD] || []).map((img: any) => img.url || "");
      } else { console.error("[deck] image storage failed:", res.status, await res.text().catch(() => "")); }
    } catch (e) { console.error("[deck] image storage error:", (e as Error).message); }
  }
  const finalUrls = permanentUrls.length ? permanentUrls : validUrls;

  // === 5. BUILD PREVIEW + STORE JSON ===
  const previewHTML = renderAuditHTML(company, audit, finalUrls);
  const deckJSON = audit ? JSON.stringify(audit) : "";
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH", headers: atHeaders,
      body: JSON.stringify({ records: [{ id: reportId, fields: {
        [REPORT_FIELDS.briefHTML]: previewHTML,
        [DECK_JSON_FIELD]: deckJSON,
        [REPORT_FIELDS.status]: "Review Pending",
      } }], typecast: true }),
    });
  } catch (e) { console.error("[deck] deck save failed:", (e as Error).message); }

  // === 6. ASANA TASK ===
  const score = audit?.brand_assessment_score || "n/a";
  const slideCount = (audit?.slides || []).length;
  if (asanaToken) {
    try {
      await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: {
          name: `Review brand audit: ${company || name}`,
          html_notes: `<body><strong>Brand audit ready for review.</strong>\n\n<strong>Client:</strong> ${name}\n<strong>Email:</strong> ${email}\n<strong>Company:</strong> ${company}\n<strong>Service:</strong> ${service}\n<strong>Assessment score:</strong> ${score}\n<strong>Sections:</strong> ${slideCount} / 13\n<strong>Mood images:</strong> ${finalUrls.length}\n\n<strong>To build the deck:</strong> open this report in Airtable, copy the <strong>Deck JSON</strong> field, and paste it into Plus AI inside Google Slides. Apply the Spazio template, curate (~15-20 min), then download as .pptx or PDF and share with the client.\n\n<em>Preview is in the Brief HTML field. Review at your pace.</em></body>`,
          projects: [ASANA_PROJECT],
          due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        } }),
      });
    } catch (e) { console.error("[deck] asana failed:", (e as Error).message); }
  }

  return Response.json({ ok: true, sections: slideCount, images: finalUrls.length });
}
