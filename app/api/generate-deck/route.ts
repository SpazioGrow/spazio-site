// Generate Deck — AI-powered design proposal
// The AI acts as creative director: makes visual design decisions, not just strategy text.
// Output: 3 creative directions, each with colors, fonts, mood boards, and visual identity concepts.

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";
const IMG_FIELD = "fldPVXauT9v4GqVZm";
const REPORT_FIELDS = { status: "fldLUKmsHhqidDFWb", briefHTML: "fld3ZgwxOlFRK27Qx" } as const;

// === PERPLEXITY: RESEARCH ===
async function runResearch(company: string, service: string, answers: string, key: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: `You are a senior brand researcher. Research "${company}" (${service}).

Client intake: ${answers}

Deliver a concise research brief covering: industry landscape, 4-5 named competitors with visual strengths/weaknesses, target audience profile, brand positioning opportunity, and visual landscape (what's overused vs. what's fresh in this space). 600 words. Use real names and data. Mark inferences with [Inferred].` }], max_tokens: 1500 }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

// === OPENAI: CREATIVE DIRECTOR — DESIGN DECISIONS ===
async function generateDesignProposal(company: string, service: string, research: string, answers: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are a world-class creative director at a premium design agency. You make bold, specific visual design decisions. Return ONLY valid JSON. No markdown. No backticks." }, { role: "user", content: `Create a design proposal for "${company}" (${service}).

RESEARCH: ${research}
INTAKE: ${answers}

Return JSON with this EXACT structure:
{
  "executiveSummary": "3 sentences: the brand challenge, the opportunity, the recommended approach",
  "targetAudience": "2 sentences describing the ideal customer and what they value visually",
  "directions": [
    {
      "name": "2-4 word evocative name",
      "tagline": "One sentence brand positioning statement for this direction",
      "concept": "3 sentences: strategic angle, emotional territory, why this works",
      "colors": [
        {"hex": "#XXXXXX", "name": "Color Name", "role": "Primary/Secondary/Accent/Neutral/Background"},
        {"hex": "#XXXXXX", "name": "Color Name", "role": "..."},
        {"hex": "#XXXXXX", "name": "Color Name", "role": "..."},
        {"hex": "#XXXXXX", "name": "Color Name", "role": "..."},
        {"hex": "#XXXXXX", "name": "Color Name", "role": "..."}
      ],
      "fonts": {
        "display": "Real font name for headlines (Google Fonts or premium foundry)",
        "body": "Real font name for body text",
        "accent": "Real font name for details/captions"
      },
      "mood": ["keyword1", "keyword2", "keyword3", "keyword4"],
      "inspiration": ["Real Brand 1", "Real Brand 2", "Real Brand 3"],
      "visualPrompt": "80-word DALL-E prompt: describe a brand mood board with specific colors, textures, materials, lighting. Abstract, atmospheric, no text, no logos, no people. Think editorial photography meets brand identity."
    }
  ],
  "recommendedDirection": 1,
  "nextSteps": ["Step 1 with timeline", "Step 2", "Step 3"]
}

Make 3 directions. Each MUST have 5 colors, 3 fonts, 4 mood keywords, 3 inspiration brands. Colors must be specific hex values that work as a cohesive palette. Fonts must be real, available fonts. Be opinionated — no generic choices.` }], max_tokens: 3500, temperature: 0.85 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const raw = (await res.json()).choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { console.error("Parse failed:", raw.slice(0, 300)); return null; }
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

// === BUILD VISUAL DECK HTML ===
function buildDeckHTML(company: string, research: string, proposal: any, imageUrls: string[]): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const dirs = proposal?.directions || [];
  const recommended = (proposal?.recommendedDirection || 1) - 1;

  const directionPages = dirs.map((d: any, i: number) => {
    const colors = (d.colors || []).map((c: any) =>
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="width:48px;height:48px;border-radius:6px;background:${c.hex};border:1px solid rgba(0,0,0,0.08);"></div>
        <div><span style="font-size:13px;font-weight:600;color:#17160F;">${c.name}</span><br/><span style="font-size:11px;color:#847F71;font-family:monospace;">${c.hex}</span><br/><span style="font-size:10px;color:#ADA897;">${c.role}</span></div>
      </div>`).join("");

    const fonts = d.fonts || {};
    const mood = (d.mood || []).map((m: string) => `<span style="display:inline-block;padding:5px 14px;background:#F5F3ED;border:1px solid #DFD9C9;border-radius:100px;font-size:12px;color:#514E44;margin:0 6px 8px 0;">${m}</span>`).join("");
    const inspo = (d.inspiration || []).map((b: string) => `<span style="display:inline-block;padding:5px 14px;background:#EBF5EF;border:1px solid #C8DFD0;border-radius:100px;font-size:12px;color:#2C5F2D;margin:0 6px 8px 0;">${b}</span>`).join("");
    const imgUrl = imageUrls[i] || "";
    const isRec = i === recommended;

    return `
    <div style="padding:48px 40px;border-top:2px solid #DFD9C9;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-family:monospace;font-size:10px;color:#2C5F2D;">DIRECTION 0${i+1}</span>
        ${isRec ? '<span style="font-size:10px;padding:3px 10px;background:#2C5F2D;color:white;border-radius:100px;">RECOMMENDED</span>' : ''}
      </div>
      <h2 style="margin:0 0 4px;font-size:36px;font-weight:600;letter-spacing:-0.03em;color:#17160F;">${d.name}</h2>
      <p style="margin:0 0 6px;font-size:16px;font-style:italic;color:#2C5F2D;">"${d.tagline || ""}"</p>
      <p style="margin:0 0 28px;font-size:15.5px;line-height:1.65;color:#514E44;max-width:680px;">${d.concept}</p>

      ${imgUrl ? `<img src="${imgUrl}" alt="Mood board — ${d.name}" style="width:100%;border-radius:8px;margin-bottom:8px;" />` : ""}
      <p style="margin:0 0 28px;font-size:10px;color:#ADA897;font-style:italic;">AI concept · licensed imagery for finals</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;">
        <div>
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#2C5F2D;font-weight:600;">Color Palette</p>
          ${colors}
        </div>
        <div>
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#2C5F2D;font-weight:600;">Typography</p>
          ${fonts.display ? `<p style="margin:0 0 8px;font-size:28px;font-weight:600;color:#17160F;">${fonts.display}</p><p style="font-size:10px;color:#847F71;margin:0 0 16px;">Headlines & Display</p>` : ""}
          ${fonts.body ? `<p style="margin:0 0 8px;font-size:18px;color:#514E44;">${fonts.body}</p><p style="font-size:10px;color:#847F71;margin:0 0 16px;">Body Copy</p>` : ""}
          ${fonts.accent ? `<p style="margin:0 0 8px;font-size:14px;font-family:monospace;color:#847F71;">${fonts.accent}</p><p style="font-size:10px;color:#847F71;margin:0;">Captions & Details</p>` : ""}
        </div>
        <div>
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#2C5F2D;font-weight:600;">Mood</p>
          <div style="margin-bottom:20px;">${mood}</div>
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#2C5F2D;font-weight:600;">Channels</p>
          <div>${inspo}</div>
        </div>
      </div>
    </div>`;
  }).join("\n");

  const researchHTML = research.split(/\n\n+/).filter(p => p.trim())
    .map(p => `<p style="margin:0 0 12px;font-size:14.5px;line-height:1.7;color:#514E44;">${p.replace(/\n/g, " ").replace(/\[Inferred\]/g, '<span style="font-size:10px;color:#ADA897;font-style:italic;">[Inferred]</span>')}</p>`).join("");

  const steps = (proposal?.nextSteps || ["Approve direction", "Design development begins", "First review in 5 business days"])
    .map((s: string, i: number) => `<div style="display:flex;gap:14px;margin-bottom:16px;"><span style="font-size:28px;font-weight:700;color:#2C5F2D;line-height:1;">${i+1}</span><p style="margin:0;font-size:15px;line-height:1.55;color:#514E44;">${s}</p></div>`).join("");

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;color:#17160F;max-width:920px;margin:0 auto;">
  <!-- COVER -->
  <div style="padding:80px 40px;background:#17160F;color:#FAF8F2;text-align:center;">
    <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#847F71;margin:0 0 32px;">Spazio · Brand Vision Deck</p>
    <h1 style="font-size:56px;font-weight:600;line-height:0.95;letter-spacing:-0.04em;margin:0 0 14px;">${company || "Your Brand"}</h1>
    <p style="font-size:13px;color:#ADA897;margin:24px 0 0;">${date} · Confidential</p>
  </div>

  <!-- OPPORTUNITY -->
  <div style="padding:48px 40px;border-bottom:2px solid #DFD9C9;">
    <span style="font-family:monospace;font-size:10px;color:#2C5F2D;">THE OPPORTUNITY</span>
    <p style="margin:16px 0 0;font-size:22px;line-height:1.5;font-weight:400;color:#17160F;max-width:720px;">${proposal?.executiveSummary || "A strategic brand opportunity awaits."}</p>
    <p style="margin:16px 0 0;font-size:14px;color:#847F71;">${proposal?.targetAudience || ""}</p>
  </div>

  <!-- 3 DIRECTIONS -->
  ${directionPages}

  <!-- RESEARCH -->
  <div style="padding:48px 40px;border-top:2px solid #DFD9C9;">
    <span style="font-family:monospace;font-size:10px;color:#2C5F2D;">RESEARCH & INTELLIGENCE</span>
    <div style="margin-top:20px;columns:2;column-gap:32px;">${researchHTML}</div>
  </div>

  <!-- NEXT STEPS -->
  <div style="padding:48px 40px;background:#17160F;color:#FAF8F2;">
    <span style="font-family:monospace;font-size:10px;color:#97BC62;">NEXT STEPS</span>
    <div style="margin-top:24px;">${steps}</div>
    <p style="margin:32px 0 0;font-size:12px;color:#847F71;font-style:italic;">Human-led, AI-accelerated. Every creative decision is made by a real designer.</p>
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
  let company = "", service = "", email = "", name = "", answers = "{}";
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
          const svc = ld.fields?.["Service Interest"];
          service = typeof svc === "object" && svc?.name ? svc.name : (typeof svc === "string" ? svc : "");
        }
      }
    }
  } catch (e) { console.error("Fetch failed", e); }

  // === 1. RESEARCH ===
  let research = "";
  if (pplxKey) { try { research = await runResearch(company, service, answers, pplxKey); } catch (e) { console.error("Research failed", e); } }

  // === 2. DESIGN PROPOSAL ===
  let proposal: any = null;
  if (oaiKey) { try { proposal = await generateDesignProposal(company, service, research, answers, oaiKey); } catch (e) { console.error("Proposal failed", e); } }

  // === 3. MOOD BOARD IMAGES (1 per direction, parallel) ===
  const dirs = proposal?.directions || [];
  let imageUrls: string[] = [];
  if (oaiKey && dirs.length) {
    const results = await Promise.all(dirs.slice(0, 3).map(async (d: any) => {
      if (!d.visualPrompt) return "";
      try { return await generateVisual(d.visualPrompt, oaiKey); } catch { return ""; }
    }));
    imageUrls = results;
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
  // Map back: use permanent URLs where available, fallback to temp
  const finalUrls = imageUrls.map((url, i) => {
    if (!url) return "";
    const permIdx = validUrls.indexOf(url);
    return permIdx >= 0 && permanentUrls[permIdx] ? permanentUrls[permIdx] : url;
  });

  // === 5. BUILD + STORE DECK ===
  const deckHTML = buildDeckHTML(company, research, proposal, finalUrls);
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH", headers: atHeaders,
      body: JSON.stringify({ records: [{ id: reportId, fields: { [REPORT_FIELDS.briefHTML]: deckHTML, [REPORT_FIELDS.status]: "Review Pending" } }], typecast: true }),
    });
  } catch (e) { console.error("Deck save failed", e); }

  // === 6. ASANA TASK ===
  const dirNames = dirs.map((d: any) => d.name).join(", ");
  if (asanaToken) {
    try {
      await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: {
          name: `Review design proposal: ${company || name}`,
          html_notes: `<body><strong>Design proposal ready for review.</strong>\n\n<strong>Client:</strong> ${name}\n<strong>Email:</strong> ${email}\n<strong>Company:</strong> ${company}\n<strong>Service:</strong> ${service}\n\n<strong>Directions:</strong> ${dirNames}\n<strong>Recommended:</strong> Direction ${(proposal?.recommendedDirection || 1)}\n<strong>Mood boards:</strong> ${permanentUrls.length} images\n\n<strong>Download PPTX:</strong>\n<a href="https://www.spaziographics.com/api/export-deck?id=${reportId}">Download Vision Deck</a>\n\n<em>Images permanently stored. Review at your pace.</em></body>`,
          projects: [ASANA_PROJECT],
          due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        }}),
      });
    } catch (e) { console.error("Asana failed", e); }
  }

  return Response.json({ ok: true, directions: dirs.length, images: permanentUrls.length });
}
