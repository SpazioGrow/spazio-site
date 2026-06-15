// Generate Deck — full creative pipeline with rich visual output.
// Perplexity research → OpenAI directions (colors, fonts, mood) → DALL·E visuals → rich deck

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";

const REPORT_FIELDS = {
  status: "fldLUKmsHhqidDFWb",
  briefHTML: "fld3ZgwxOlFRK27Qx",
} as const;

// === PERPLEXITY: RESEARCH ===
async function runResearch(company: string, service: string, answers: string, key: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: `You are a senior brand researcher. Conduct a thorough brand intelligence analysis.

Company: ${company}
Service: ${service}
Intake data: ${answers}

Cover:
1. MARKET LANDSCAPE — Industry size, growth, key trends
2. COMPETITIVE ANALYSIS — 4-5 competitors, strengths, visual weaknesses
3. AUDIENCE PROFILE — Ideal customer, values, discovery channels
4. BRAND OPPORTUNITY — Positioning white space, strategic angle
5. VISUAL LANDSCAPE — Dominant visual language, what's overused, what's fresh

Be specific with names and data. 800-1000 words. Professional prose, no filler.` }], max_tokens: 2000 }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content ?? "";
}

// === OPENAI: CREATIVE DIRECTOR (rich output) ===
async function generateDirections(company: string, research: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: `You are a world-class creative director at a premium design agency. Based on this research, create 3 distinct creative directions for "${company}".

RESEARCH:
${research}

For each direction provide ALL of these:
- name: 2-4 word evocative name (e.g. "Quiet Authority", "Raw Momentum")
- concept: 3 sentences — strategic angle, emotional territory, what makes it different
- colorPalette: array of 5 objects with "hex" and "name" (e.g. {"hex":"#2C3E50","name":"Midnight Navy"})
- fonts: object with "display" (headline font), "body" (paragraph font), "accent" (detail font) — use real font names from Google Fonts or premium type foundries
- mood: array of 4-5 adjective keywords
- inspiration: array of 3-4 real brand/publication names this direction channels
- visualPrompt: 80-word DALL-E prompt for an abstract mood board. Describe specific colors, textures, materials, lighting, composition. No text, no logos, no people. Atmospheric and editorial.

Respond ONLY with a JSON array of 3 objects. No markdown, no backticks, no explanation.` }], max_tokens: 2500, temperature: 0.9 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const d = await res.json();
  const raw = d.choices?.[0]?.message?.content ?? "[]";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return []; }
}

// === DALL·E ===
async function generateVisual(prompt: string, key: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt: `Brand mood board: ${prompt}. Abstract, atmospheric, no text, no logos, no people. Cinematic editorial photography.`, n: 1, size: "1792x1024", quality: "standard" }),
  });
  if (!res.ok) throw new Error(`DALL-E ${res.status}`);
  const d = await res.json();
  return d.data?.[0]?.url ?? "";
}

// === BUILD RICH DECK HTML ===
function buildDeckHTML(company: string, service: string, research: string, directions: any[]): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const researchHTML = research.split(/\n\n+/).filter(p => p.trim()).map(p => {
    const lines = p.split("\n");
    const first = lines[0].replace(/^\d+\.\s*/, "").replace(/[*_#]/g, "").trim();
    if (/^[A-Z]{2,}/.test(first) || /^\d+\./.test(p.trim())) {
      return `<p style="margin: 28px 0 6px; font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #3E7D5A;">${first}</p><p style="margin: 0 0 14px; font-size: 15.5px; line-height: 1.7; color: #17160F;">${lines.slice(1).join(" ").trim()}</p>`;
    }
    return `<p style="margin: 0 0 14px; font-size: 15.5px; line-height: 1.7; color: #17160F;">${p.replace(/\n/g, " ").trim()}</p>`;
  }).join("\n");

  const directionsHTML = directions.map((d, i) => {
    const colors = (d.colorPalette || []).map((c: any) =>
      `<div style="display:inline-flex;align-items:center;gap:8px;margin:0 14px 8px 0;">
        <div style="width:32px;height:32px;border-radius:4px;background:${c.hex};border:1px solid #DFD9C9;"></div>
        <div><span style="font-size:12px;font-weight:600;color:#17160F;">${c.name}</span><br/><span style="font-size:11px;color:#847F71;font-family:monospace;">${c.hex}</span></div>
      </div>`).join("");

    const fonts = d.fonts || {};
    const fontsHTML = `<div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:4px;">
      ${fonts.display ? `<div><span style="font-size:11px;color:#847F71;text-transform:uppercase;letter-spacing:0.06em;">Display</span><br/><span style="font-size:16px;font-weight:600;">${fonts.display}</span></div>` : ""}
      ${fonts.body ? `<div><span style="font-size:11px;color:#847F71;text-transform:uppercase;letter-spacing:0.06em;">Body</span><br/><span style="font-size:16px;font-weight:600;">${fonts.body}</span></div>` : ""}
      ${fonts.accent ? `<div><span style="font-size:11px;color:#847F71;text-transform:uppercase;letter-spacing:0.06em;">Accent</span><br/><span style="font-size:16px;font-weight:600;">${fonts.accent}</span></div>` : ""}
    </div>`;

    const mood = (d.mood || []).map((m: string) => `<span style="display:inline-block;padding:4px 12px;background:#F5F3ED;border:1px solid #DFD9C9;border-radius:100px;font-size:12px;color:#514E44;margin:0 6px 6px 0;">${m}</span>`).join("");
    const inspo = (d.inspiration || []).map((b: string) => `<span style="display:inline-block;padding:4px 12px;background:#EBF5EF;border:1px solid #C8DFD0;border-radius:100px;font-size:12px;color:#3E7D5A;margin:0 6px 6px 0;">${b}</span>`).join("");

    return `
    <div style="margin-bottom: 56px; padding-bottom: 48px; ${i < directions.length - 1 ? "border-bottom: 1px solid #DFD9C9;" : ""}">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px;">
        <span style="font-family:monospace;font-size:11px;color:#3E7D5A;">0${i+1}</span>
        <h3 style="margin:0;font-size:30px;font-weight:600;letter-spacing:-0.025em;color:#17160F;">${d.name || `Direction ${i+1}`}</h3>
      </div>
      <p style="font-size:16.5px;line-height:1.6;color:#514E44;margin:0 0 24px;max-width:640px;">${d.concept || ""}</p>

      ${d.imageUrl ? `<img src="${d.imageUrl}" alt="Mood board for ${d.name}" style="width:100%;max-width:860px;border-radius:8px;border:1px solid #DFD9C9;margin-bottom:24px;" />` : ""}
      <p style="margin:0 0 24px;font-size:11px;color:#ADA897;font-style:italic;">AI concept placeholder — licensed imagery for finals</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#3E7D5A;font-weight:600;">Color palette</p>
          <div style="display:flex;flex-wrap:wrap;">${colors}</div>
        </div>
        <div>
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#3E7D5A;font-weight:600;">Typography</p>
          ${fontsHTML}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;">
        <div>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#3E7D5A;font-weight:600;">Mood</p>
          <div>${mood}</div>
        </div>
        <div>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#3E7D5A;font-weight:600;">Inspiration</p>
          <div>${inspo}</div>
        </div>
      </div>
    </div>`;
  }).join("\n");

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;color:#17160F;max-width:900px;margin:0 auto;">
  <div style="padding:80px 40px;text-align:center;border-bottom:2px solid #DFD9C9;margin-bottom:48px;">
    <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#847F71;margin:0 0 28px;">Spazio — Brand Intelligence Report</p>
    <h1 style="font-size:52px;font-weight:600;line-height:1;letter-spacing:-0.035em;margin:0 0 16px;">${company || "Your Brand"}</h1>
    <p style="font-size:20px;color:#514E44;margin:0 0 8px;">${service || "Strategic Brief"}</p>
    <p style="font-size:13px;color:#ADA897;margin:28px 0 0;">${date}</p>
  </div>
  <div style="padding:0 40px 48px;border-bottom:2px solid #DFD9C9;margin-bottom:48px;">
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#3E7D5A;margin:0 0 28px;">Market & Brand Intelligence</p>
    ${researchHTML}
  </div>
  <div style="padding:0 40px 48px;border-bottom:2px solid #DFD9C9;margin-bottom:48px;">
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#3E7D5A;margin:0 0 8px;">Creative Directions</p>
    <p style="font-size:15px;color:#847F71;margin:0 0 40px;">Three strategic territories. Each includes a color palette, typography, mood board, and brand inspiration.</p>
    ${directionsHTML}
  </div>
  <div style="padding:0 40px 48px;">
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#3E7D5A;margin:0 0 24px;">Next Steps</p>
    <div style="font-size:16px;line-height:1.6;color:#514E44;padding:28px;background:#FBF9F3;border:1px solid #DFD9C9;border-radius:8px;">
      <p style="margin:0 0 14px;"><strong>1. Review & select</strong> — Choose the direction that resonates, or tell us what to adjust.</p>
      <p style="margin:0 0 14px;"><strong>2. Design development</strong> — Full brand system built from your selected direction.</p>
      <p style="margin:0 0 14px;"><strong>3. Refinement</strong> — Two rounds to dial in every detail.</p>
      <p style="margin:0;"><strong>Human-led, AI-accelerated.</strong> Every creative decision is made by a real designer.</p>
    </div>
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

  // Fetch lead + report data
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
  let research = "Research pending.";
  if (pplxKey) { try { research = await runResearch(company, service, answers, pplxKey); } catch (e) { console.error("Research failed", e); } }

  // === 2. OPENAI CREATIVE DIRECTIONS ===
  let directions: any[] = [];
  if (oaiKey) { try { directions = await generateDirections(company, research, oaiKey); } catch (e) { console.error("Directions failed", e); } }
  if (!directions.length) {
    directions = [
      { name: "Direction A", concept: "Pending generation.", colorPalette: [], fonts: {}, mood: [], inspiration: [], visualPrompt: "" },
      { name: "Direction B", concept: "Pending generation.", colorPalette: [], fonts: {}, mood: [], inspiration: [], visualPrompt: "" },
      { name: "Direction C", concept: "Pending generation.", colorPalette: [], fonts: {}, mood: [], inspiration: [], visualPrompt: "" },
    ];
  }

  // === 3. DALL·E VISUALS (parallel) ===
  const enriched = await Promise.all(directions.map(async (d: any) => {
    let imageUrl = "";
    if (oaiKey && d.visualPrompt) { try { imageUrl = await generateVisual(d.visualPrompt, oaiKey); } catch (e) { console.error(`Visual failed: ${d.name}`, e); } }
    return { ...d, imageUrl };
  }));

  // === 4. SAVE IMAGES TO AIRTABLE (permanent storage) ===
  const imageUrls = enriched.map((d: any) => d.imageUrl).filter(Boolean);
  const attachments = imageUrls.map((url: string) => ({ url }));
  let permanentUrls: string[] = [];
  if (attachments.length) {
    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
        method: "PATCH", headers: atHeaders,
        body: JSON.stringify({ records: [{ id: reportId, fields: { "fldPVXauT9v4GqVZm": attachments } }] }),
      });
      if (res.ok) {
        const data = await res.json();
        const imgs = data.records?.[0]?.fields?.["fldPVXauT9v4GqVZm"] || [];
        permanentUrls = imgs.map((img: any) => img.url || "");
      }
    } catch (e) { console.error("Image upload failed", e); }
  }

  // Map permanent URLs back to directions
  let urlIdx = 0;
  const finalDirections = enriched.map((d: any) => {
    if (d.imageUrl && urlIdx < permanentUrls.length) {
      return { ...d, imageUrl: permanentUrls[urlIdx++] };
    }
    return d;
  });

  // === 5. BUILD + STORE HTML DECK ===
  const deckHTML = buildDeckHTML(company, service, research, finalDirections);
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH", headers: atHeaders,
      body: JSON.stringify({ records: [{ id: reportId, fields: { [REPORT_FIELDS.briefHTML]: deckHTML, [REPORT_FIELDS.status]: "Review Pending" } }], typecast: true }),
    });
  } catch (e) { console.error("Deck save failed", e); }

  // === 6. ASANA TASK ===
  const dirNames = finalDirections.map((d: any) => d.name).join(", ");
  if (asanaToken) {
    try {
      await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: {
          name: `Review deck: ${company || name}`,
          html_notes: `<body><strong>Brand intelligence deck ready for review.</strong>\n\n<strong>Client:</strong> ${name}\n<strong>Email:</strong> ${email}\n<strong>Company:</strong> ${company}\n<strong>Service:</strong> ${service}\n<strong>Directions:</strong> ${dirNames}\n\n<strong>Download deck (PPTX):</strong>\n<a href="https://www.spaziographics.com/api/export-deck?id=${reportId}">Download Vision Deck</a>\n\n<em>Images are permanently stored in Airtable.</em></body>`,
          projects: [ASANA_PROJECT],
          due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        }}),
      });
    } catch (e) { console.error("Asana failed", e); }
  }

  return Response.json({ ok: true });
}
