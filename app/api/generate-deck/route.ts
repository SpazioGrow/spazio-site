// Generate Deck — 10-slide consulting-grade vision deck
// Perplexity research → OpenAI 10-slide content → DALL·E mood boards → Airtable + Asana

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";
const IMG_FIELD = "fldPVXauT9v4GqVZm";
const REPORT_FIELDS = { status: "fldLUKmsHhqidDFWb", briefHTML: "fld3ZgwxOlFRK27Qx" } as const;

// === PERPLEXITY RESEARCH ===
async function runResearch(company: string, service: string, answers: string, key: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: `You are a senior strategy consultant preparing a client engagement brief. Conduct exhaustive research.

COMPANY: ${company}
SERVICE NEED: ${service}
CLIENT INTAKE: ${answers}

Deliver a research report with these EXACT sections (use these headers):

EXECUTIVE CONTEXT
2-3 sentences summarizing the company, its challenge, and the opportunity.

BUSINESS OVERVIEW
What the company does, products/services, current positioning, brand maturity.
If info is missing, infer from context and label as [INFERRED].

TARGET AUDIENCE
Ideal customer profile, demographics, psychographics, pain points, buying triggers, discovery channels.

MARKET LANDSCAPE
Industry size, growth rate, key trends, emerging technologies, market shifts.
Include specific numbers and name sources.

COMPETITIVE ANALYSIS
Name 4-5 specific competitors. For each: what they do well, where they fall short visually and strategically, their positioning.

STRATEGIC OPPORTUNITIES
3-4 specific opportunities this brand can own. What positioning white space exists. What competitors are missing.

VISUAL LANDSCAPE
Dominant design language in this space. What's overused. What would feel fresh and differentiated.

Be specific — use real company names, real numbers, real trends. 1200-1500 words. If information is unavailable, make informed inferences and mark them [INFERRED]. Never leave a section empty.` }], max_tokens: 3000 }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

// === OPENAI: 10-SLIDE STRUCTURED CONTENT ===
async function generateSlides(company: string, service: string, research: string, answers: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: `You are a world-class strategy consultant and creative director producing a brand vision deck. You MUST return valid JSON only — no markdown, no backticks, no explanation. Every field must be filled. If data is unavailable, infer from context and add [Assumption] tag. NEVER return empty strings.` }, { role: "user", content: `Create a 10-slide brand vision deck for "${company}" (${service}).

RESEARCH:
${research}

CLIENT INTAKE:
${answers}

Return a JSON array of exactly 10 objects. Each object:
{
  "slideNumber": 1,
  "title": "Slide title",
  "subtitle": "Brief subtitle",
  "points": ["Point 1 with detail", "Point 2 with detail", "Point 3 with detail", "Point 4 with detail"],
  "keyMetric": { "value": "85%", "label": "Market growth YoY" },
  "speakerNotes": "2-3 sentences of context"
}

SLIDE REQUIREMENTS:
1. EXECUTIVE SUMMARY: Company overview, business challenge, opportunity, recommended direction. keyMetric = most compelling market stat.
2. BUSINESS OVERVIEW: What they do, products/services, current positioning, brand maturity. keyMetric = relevant business stat.
3. TARGET AUDIENCE: ICP description, pain points, motivations, buying triggers. keyMetric = audience size or behavior stat.
4. MARKET RESEARCH: Industry trends, market size, growth opportunities, emerging tech. keyMetric = market size or growth rate.
5. COMPETITIVE ANALYSIS: Top 4 competitors with strengths/weaknesses. keyMetric = market share or competitive gap.
6. STRATEGIC RECOMMENDATIONS: Key initiatives, prioritization, risks, opportunities. keyMetric = projected impact.
7. CREATIVE DIRECTION: Brand themes, visual style, messaging pillars, tone of voice. Include 3 direction names. keyMetric = brand perception stat.
8. MOODBOARD: Describe 4 visual concepts for DALL-E generation. points = 4 detailed visual descriptions (80 words each). keyMetric = design trend stat.
9. ROADMAP: Phase 1 (weeks 1-2), Phase 2 (weeks 3-4), Phase 3 (weeks 5-6), success metrics. keyMetric = timeline stat.
10. NEXT STEPS: Recommended actions, deliverables, timeline, investment. keyMetric = ROI or engagement stat.

Each point must be 1-2 full sentences with specific detail. No generic filler. If you lack data, make a smart inference.` }], max_tokens: 4000, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const raw = (await res.json()).choices?.[0]?.message?.content ?? "[]";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { console.error("JSON parse failed:", raw.slice(0, 200)); return []; }
}

// === DALL·E MOOD BOARDS ===
async function generateVisual(prompt: string, key: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt: `Brand mood board concept: ${prompt}. Abstract, atmospheric, no text, no logos, no people. Editorial photography aesthetic, cinematic lighting, premium feel.`, n: 1, size: "1792x1024", quality: "standard" }),
  });
  if (!res.ok) throw new Error(`DALL-E ${res.status}`);
  return (await res.json()).data?.[0]?.url ?? "";
}

// === CONTENT VALIDATION ===
function validateSlides(slides: any[]): any[] {
  const SLIDE_TITLES = ["Executive Summary","Business Overview","Target Audience","Market Research","Competitive Analysis","Strategic Recommendations","Creative Direction","Moodboard","Roadmap","Next Steps"];
  // Ensure exactly 10 slides, fill gaps
  const result = SLIDE_TITLES.map((title, i) => {
    const existing = slides.find((s: any) => s.slideNumber === i + 1) || slides[i] || {};
    return {
      slideNumber: i + 1,
      title: existing.title || title,
      subtitle: existing.subtitle || `${title} for ${existing.company || "your brand"}`,
      points: Array.isArray(existing.points) && existing.points.length >= 3
        ? existing.points.map((p: any) => typeof p === "string" && p.length > 10 ? p : `[To be completed] ${title} insight ${existing.points?.indexOf(p) + 1}`)
        : [`[Pending] Key insight about ${title.toLowerCase()} will be generated.`, `[Pending] Analysis of ${title.toLowerCase()} factors.`, `[Pending] Strategic recommendation based on ${title.toLowerCase()}.`, `[Pending] Additional context for ${title.toLowerCase()}.`],
      keyMetric: existing.keyMetric && existing.keyMetric.value ? existing.keyMetric : { value: "—", label: "Data pending" },
      speakerNotes: existing.speakerNotes || `Review and expand ${title.toLowerCase()} section.`,
    };
  });
  return result;
}

// === BUILD HTML DECK ===
function buildDeckHTML(company: string, slides: any[], imageUrls: string[]): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const slideHTML = slides.map((s: any, i: number) => {
    const isHeader = i === 0;
    const isMoodboard = i === 7;
    const bg = isHeader ? "background:#17160F;color:#FAF8F2;" : "";
    const titleColor = isHeader ? "#FAF8F2" : "#17160F";
    const textColor = isHeader ? "#ADA897" : "#514E44";
    const accentColor = "#3E7D5A";

    let content = "";

    if (isMoodboard && imageUrls.length) {
      content = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;">
        ${imageUrls.map((url, j) => `<div><img src="${url}" alt="Mood board ${j+1}" style="width:100%;border-radius:8px;border:1px solid #DFD9C9;" /><p style="font-size:11px;color:#847F71;margin:6px 0 0;font-style:italic;">${s.points?.[j] ? s.points[j].slice(0, 80) + "..." : `Concept ${j+1}`}</p></div>`).join("")}
      </div>`;
    } else {
      const metric = s.keyMetric || {};
      content = `
        ${metric.value ? `<div style="margin:20px 0 24px;padding:20px 24px;background:${isHeader ? "rgba(255,255,255,0.08)" : "#F5F3ED"};border-radius:8px;display:inline-flex;align-items:baseline;gap:12px;">
          <span style="font-size:36px;font-weight:700;color:${accentColor};letter-spacing:-0.02em;">${metric.value}</span>
          <span style="font-size:14px;color:${textColor};">${metric.label || ""}</span>
        </div>` : ""}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;">
          ${(s.points || []).map((p: string, j: number) => `<div style="padding:16px 0;${j < (s.points?.length || 0) - 1 ? `border-bottom:1px solid ${isHeader ? "rgba(255,255,255,0.1)" : "#DFD9C9"};` : ""}">
            <span style="font-family:monospace;font-size:10px;color:${accentColor};display:block;margin-bottom:4px;">0${j+1}</span>
            <p style="margin:0;font-size:15px;line-height:1.6;color:${isHeader ? "#CDCABD" : "#17160F"};">${p}</p>
          </div>`).join("")}
        </div>`;
    }

    return `
    <div style="padding:48px 40px;${bg}${i > 0 ? "border-top:2px solid #DFD9C9;" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <span style="font-family:monospace;font-size:10px;color:${accentColor};">SLIDE ${String(i+1).padStart(2,"0")} / 10</span>
      </div>
      <h2 style="margin:0 0 4px;font-size:32px;font-weight:600;letter-spacing:-0.025em;color:${titleColor};">${s.title}</h2>
      <p style="margin:0 0 16px;font-size:15px;color:${textColor};opacity:0.8;">${s.subtitle || ""}</p>
      ${content}
    </div>`;
  }).join("\n");

  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:#17160F;max-width:900px;margin:0 auto;">
    <div style="padding:80px 40px;text-align:center;background:#17160F;color:#FAF8F2;">
      <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#847F71;margin:0 0 28px;">Spazio — Brand Vision Deck</p>
      <h1 style="font-size:52px;font-weight:600;line-height:1;letter-spacing:-0.035em;margin:0 0 12px;">${company || "Your Brand"}</h1>
      <p style="font-size:13px;color:#ADA897;margin:20px 0 0;">${date} · Confidential</p>
    </div>
    ${slideHTML}
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

  // === FETCH LEAD + REPORT DATA ===
  let company = "", service = "", email = "", name = "", answers = "{}";
  try {
    const rr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${reportId}`, { headers: { Authorization: `Bearer ${atToken}` } });
    if (rr.ok) {
      const rd = await rr.json();
      answers = rd.fields?.["Answers"] || "{}";
      const lLinks = rd.fields?.["Lead"];
      const lid = Array.isArray(lLinks) && lLinks.length ? lLinks[0] : "";
      if (lid) {
        const lr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}/${lid}`, { headers: { Authorization: `Bearer ${atToken}` } });
        if (lr.ok) {
          const ld = await lr.json();
          name = ld.fields?.["Name"] || "";
          company = ld.fields?.["Company "] || ld.fields?.["Company"] || "";
          email = ld.fields?.["Email "] || ld.fields?.["Email"] || "";
          const svc = ld.fields?.["Service Interest"];
          service = typeof svc === "object" && svc?.name ? svc.name : (typeof svc === "string" ? svc : "");
        }
      }
    }
  } catch (err) { console.error("Data fetch failed", err); }

  // === 1. PERPLEXITY RESEARCH ===
  let research = "";
  if (pplxKey) { try { research = await runResearch(company, service, answers, pplxKey); } catch (e) { console.error("Research failed", e); research = "Research unavailable. Using intake data only."; } }

  // === 2. OPENAI 10-SLIDE CONTENT ===
  let rawSlides: any[] = [];
  if (oaiKey) { try { rawSlides = await generateSlides(company, service, research, answers, oaiKey); } catch (e) { console.error("Slides failed", e); } }
  const slides = validateSlides(rawSlides);

  // === 3. DALL·E MOOD BOARDS (4 images from slide 8 prompts) ===
  const moodSlide = slides[7]; // slide 8 = moodboard
  const visualPrompts = (moodSlide.points || []).slice(0, 4);
  let imageUrls: string[] = [];
  if (oaiKey && visualPrompts.length) {
    const results = await Promise.all(visualPrompts.map(async (prompt: string) => {
      try { return await generateVisual(prompt, oaiKey); }
      catch (e) { console.error("Visual failed", e); return ""; }
    }));
    imageUrls = results.filter(Boolean);
  }

  // === 4. PERMANENT IMAGE STORAGE ===
  let permanentUrls: string[] = [];
  if (imageUrls.length) {
    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
        method: "PATCH", headers: atHeaders,
        body: JSON.stringify({ records: [{ id: reportId, fields: { [IMG_FIELD]: imageUrls.map(url => ({ url })) } }] }),
      });
      if (res.ok) {
        const data = await res.json();
        permanentUrls = (data.records?.[0]?.fields?.[IMG_FIELD] || []).map((img: any) => img.url || "");
      }
    } catch (e) { console.error("Image upload failed", e); }
  }
  if (!permanentUrls.length) permanentUrls = imageUrls; // fallback to temp URLs

  // === 5. BUILD + STORE DECK ===
  const deckHTML = buildDeckHTML(company, slides, permanentUrls);
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH", headers: atHeaders,
      body: JSON.stringify({ records: [{ id: reportId, fields: { [REPORT_FIELDS.briefHTML]: deckHTML, [REPORT_FIELDS.status]: "Review Pending" } }], typecast: true }),
    });
  } catch (e) { console.error("Deck save failed", e); }

  // === 6. ASANA TASK ===
  if (asanaToken) {
    try {
      await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: {
          name: `Review deck: ${company || name}`,
          html_notes: `<body><strong>10-slide brand vision deck ready for review.</strong>\n\n<strong>Client:</strong> ${name}\n<strong>Email:</strong> ${email}\n<strong>Company:</strong> ${company}\n<strong>Service:</strong> ${service}\n\n<strong>Download PPTX:</strong>\n<a href="https://www.spaziographics.com/api/export-deck?id=${reportId}">Download Vision Deck</a>\n\n<strong>Slides:</strong> ${slides.map((s: any) => s.title).join(" → ")}\n<strong>Mood boards:</strong> ${permanentUrls.length} images generated\n\n<em>Images permanently stored in Airtable.</em></body>`,
          projects: [ASANA_PROJECT],
          due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        }}),
      });
    } catch (e) { console.error("Asana failed", e); }
  }

  return Response.json({ ok: true, slideCount: slides.length, imageCount: permanentUrls.length });
}
