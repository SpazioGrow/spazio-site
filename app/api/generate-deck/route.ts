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
4 Market Research & Intelligence — trends, category evolution, white space; CITE real sources from RESEARCH; visual = chart of a real market figure.
5 Competitor Benchmarking — direct + aspirational competitors; what they do well, where they fail (visual + strategic); CITE; visual = comparison table.
6 Brand Positioning — current / perceived / ideal + gap analysis; visual = 2x2 positioning map.
7 Visual Identity Benchmarking — category visual standards: table-stakes, overused, what would feel fresh.`;

const BATCH_B_SECTIONS = `8 Visual Identity Audit — logo (or typical category issues if unknown), typography, color psychology, design-system maturity, UI/brand consistency, aesthetic scorecard; visual = scorecard.
9 Messaging & Tone Audit — clarity, consistency, emotional resonance; evaluate or propose a tagline; visual = before/after table.
10 Creative Direction — moodboard description, style references, typography direction, color palette with hex codes, personality keywords; visual = palette.
11 Visual Moodboard — put 6-8 DALL-E image prompts as separate strings in "insights" (abstract, atmospheric, no text, no logos, no people).
12 Strategic Recommendations — ranked by priority; visual = impact vs effort matrix.
13 Next Steps — immediate actions, strategic priorities, Spazio deliverables; visual = 3-phase roadmap; close toward a full brand-system engagement.`;

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
      max_tokens: 7000, temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const raw = (await res.json()).choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); }
  catch (e) { console.error("Audit batch parse failed:", raw.slice(0, 300)); return null; }
}

// === Orchestrate: two batches in parallel, then merge ===
async function generateAuditDeck(company: string, service: string, research: string, answers: string, links: string, key: string) {
  const [a, b] = await Promise.all([
    generateAuditBatch(company, service, research, answers, links, key, BATCH_A_SECTIONS, true).catch(() => null),
    generateAuditBatch(company, service, research, answers, links, key, BATCH_B_SECTIONS, false).catch(() => null),
  ]);
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
  if (!res.ok) throw new Error(`DALL-E ${res.status}`);
  return (await res.json()).data?.[0]?.url ?? "";
}

// === READABLE HTML PREVIEW (for internal review in Airtable) ===
function renderAuditHTML(company: string, audit: any, imageUrls: string[]): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const score = audit?.brand_assessment_score || "";
  const slides = audit?.slides || [];
  const moodImgs = imageUrls.filter(Boolean);

  const sections = slides.map((s: any) => {
    const insights = (s.insights || []).map((i: string) => `<li style="margin:0 0 8px;font-size:14.5px;line-height:1.6;color:#514E44;">${esc(i)}</li>`).join("");
    const recs = (s.recommendations || []).length
      ? `<p style="margin:14px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#2C5F2D;font-weight:600;">Recommendations</p><ul style="margin:0 0 0 18px;padding:0;">${(s.recommendations || []).map((r: string) => `<li style="margin:0 0 6px;font-size:14px;color:#514E44;">${esc(r)}</li>`).join("")}</ul>` : "";
    const metric = s.key_metric?.value
      ? `<div style="display:inline-block;margin:0 0 12px;padding:10px 16px;background:#EBF5EF;border-radius:8px;"><span style="font-size:26px;font-weight:700;color:#2C5F2D;">${esc(s.key_metric.value)}</span> <span style="font-size:12px;color:#847F71;">${esc(s.key_metric.label || "")}</span></div>` : "";
    const vis = s.visual
      ? `<p style="margin:14px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#847F71;font-weight:600;">Visual · ${esc(s.visual.type || "")}</p><p style="margin:0;font-size:13px;color:#847F71;font-style:italic;">${esc(s.visual.title ? s.visual.title + " — " : "")}${esc(s.visual.description || "")}</p>` : "";
    const srcs = (s.sources || []).length
      ? `<p style="margin:14px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#847F71;font-weight:600;">Sources</p>${(s.sources || []).map((x: any) => `<p style="margin:0 0 4px;font-size:11px;color:#ADA897;">${esc(x.claim || "")} — ${esc(x.source || "")}</p>`).join("")}` : "";
    const imgs = s.section_number === 11 && moodImgs.length
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;">${moodImgs.map(u => `<img src="${u}" style="width:100%;border-radius:8px;" />`).join("")}</div>` : "";
    return `<div style="padding:36px 40px;border-top:2px solid #DFD9C9;">
      <span style="font-family:monospace;font-size:10px;color:#2C5F2D;">${String(s.section_number || "").padStart(2, "0")} / 13</span>
      <h2 style="margin:6px 0 4px;font-size:30px;font-weight:600;letter-spacing:-.02em;color:#17160F;">${esc(s.title || "")}</h2>
      ${s.headline_insight ? `<p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#2C5F2D;font-style:italic;">${esc(s.headline_insight)}</p>` : ""}
      ${metric}
      ${insights ? `<ul style="margin:0 0 0 18px;padding:0;">${insights}</ul>` : ""}
      ${s.analysis ? `<p style="margin:14px 0 0;font-size:14.5px;line-height:1.65;color:#514E44;">${esc(s.analysis)}</p>` : ""}
      ${recs}${imgs}${vis}${srcs}
    </div>`;
  }).join("");

  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:#17160F;max-width:920px;margin:0 auto;">
    <div style="padding:80px 40px;background:#17160F;color:#FAF8F2;text-align:center;">
      <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#847F71;margin:0 0 28px;">Spazio · Brand Audit</p>
      <h1 style="font-size:52px;font-weight:600;line-height:.95;letter-spacing:-.04em;margin:0 0 14px;">${esc(company || "Your Brand")}</h1>
      ${audit?.deck_title ? `<p style="font-size:16px;color:#ADA897;margin:0;">${esc(audit.deck_title)}</p>` : ""}
      ${score ? `<p style="font-size:13px;color:#97BC62;margin:18px 0 0;">Brand Assessment: ${esc(score)}</p>` : ""}
      <p style="font-size:12px;color:#847F71;margin:18px 0 0;">${date} · Confidential</p>
    </div>
    ${sections}
    <div style="padding:36px 40px;background:#17160F;color:#FAF8F2;">
      <p style="margin:0;font-size:12px;color:#847F71;font-style:italic;">Human-led, AI-accelerated. Every creative decision is made by a real designer.</p>
    </div>
  </div>`.trim();
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
  if (pplxKey) { try { research = await runResearch(company, service, answers, links, pplxKey); } catch (e) { console.error("Research failed", e); } }

  // === 2. BRAND AUDIT (13 sections, two batches) ===
  let audit: any = null;
  if (oaiKey) { try { audit = await generateAuditDeck(company, service, research, answers, links, oaiKey); } catch (e) { console.error("Audit failed", e); } }

  // === 3. MOOD IMAGES (from section 11 prompts) ===
  const moodSlide = (audit?.slides || []).find((s: any) => s.section_number === 11);
  const moodPrompts: string[] = Array.isArray(moodSlide?.insights) ? moodSlide.insights.filter(Boolean).slice(0, 4) : [];
  let imageUrls: string[] = [];
  if (oaiKey && moodPrompts.length) {
    imageUrls = await Promise.all(moodPrompts.map(async (p) => {
      try { return await generateVisual(p, oaiKey); } catch { return ""; }
    }));
  }

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
      }
    } catch (e) { console.error("Image storage failed", e); }
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
  } catch (e) { console.error("Deck save failed", e); }

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
    } catch (e) { console.error("Asana failed", e); }
  }

  return Response.json({ ok: true, sections: slideCount, images: finalUrls.length });
}
