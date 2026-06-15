// Generate Deck — the full creative pipeline.
// Called fire-and-forget after foundation form submit.
// 1. Perplexity: market/competitor/brand research
// 2. OpenAI: 3 creative directions from research
// 3. DALL·E: concept visual per direction
// 4. Build 4-page deck HTML
// 5. Store in Airtable
// 6. Create Asana review task

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";

const REPORT_FIELDS = {
  status: "fldLUKmsHhqidDFWb",
  briefHTML: "fld3ZgwxOlFRK27Qx",
  answers: "fldgTPk5L6fnvZzZo",
  lead: "flduD1QjX8XxucINU",
} as const;

const LEAD_FIELDS = {
  name: "fldcNCcvpv3UYK7sR",
  company: "fldK7UmiFjbqxuibh",
  email: "fld8bcTQhFU2ZBxKS",
  service: "fld15eMrZbh2n8Kev",
} as const;

// === PERPLEXITY: RESEARCH LAYER ===
async function runResearch(company: string, service: string, answers: string, key: string): Promise<string> {
  const prompt = `You are a senior brand researcher at a high-end design agency. Conduct a thorough brand intelligence analysis for a potential client.

Company: ${company}
Service interest: ${service}
Client intake data: ${answers}

Deliver a structured research report covering:
1. MARKET LANDSCAPE — Industry size, growth trajectory, key trends shaping the space right now
2. COMPETITIVE ANALYSIS — 4-5 direct and aspirational competitors, what they do well, where they fall short visually and strategically
3. AUDIENCE PROFILE — Who the ideal customer is, what they value, how they discover and evaluate brands in this space
4. BRAND OPPORTUNITY — The specific gap this brand can own, the positioning white space, the strategic angle competitors are missing
5. VISUAL LANDSCAPE — The dominant visual language in this space, what's overused, what would feel fresh

Write in clear, opinionated, professional prose. Be specific with competitor names and market data. No filler. 800-1000 words.`;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }], max_tokens: 2000 }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// === OPENAI: CREATIVE DIRECTOR LAYER ===
async function generateDirections(company: string, research: string, key: string): Promise<Array<{name: string; concept: string; visualPrompt: string}>> {
  const prompt = `You are a senior creative director at a high-end design agency. Based on this brand research, create exactly 3 distinct creative directions for the brand "${company}".

RESEARCH:
${research}

For each direction, provide:
- name: A 2-4 word evocative direction name (e.g. "Quiet Authority", "Raw Momentum", "Soft Industrial")
- concept: 2-3 sentences describing the strategic angle, visual mood, and emotional territory
- visualPrompt: A detailed DALL-E image prompt for a brand mood board. Describe specific colors, textures, composition, lighting, and aesthetic. No text or logos. Abstract/atmospheric. 100 words max.

Respond ONLY with a JSON array of 3 objects. No markdown, no explanation, no backticks. Just the raw JSON array.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 1200, temperature: 0.9 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "[]";
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return []; }
}

// === DALL·E: VISUAL LAYER ===
async function generateVisual(prompt: string, key: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt: `Brand mood board concept: ${prompt}. Abstract, atmospheric, no text, no logos, no people. Editorial photography aesthetic, cinematic lighting.`, n: 1, size: "1792x1024", quality: "standard" }),
  });
  if (!res.ok) throw new Error(`DALL-E ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.url ?? "";
}

// === BUILD 4-PAGE DECK HTML ===
function buildDeckHTML(company: string, service: string, research: string, directions: Array<{name: string; concept: string; imageUrl: string}>): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const researchHTML = research.split(/\n\n+/).filter(p => p.trim()).map(p => {
    if (/^\d+\.\s|^[A-Z]{2,}/.test(p.trim())) {
      const lines = p.split("\n");
      const heading = lines[0].replace(/^\d+\.\s*/, "").replace(/[*_]/g, "");
      const body = lines.slice(1).join(" ").trim();
      return `<p style="margin: 24px 0 6px; font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; color: #3E7D5A;">${heading}</p><p style="margin: 0 0 14px; font-size: 15.5px; line-height: 1.65;">${body}</p>`;
    }
    return `<p style="margin: 0 0 14px; font-size: 15.5px; line-height: 1.65;">${p.replace(/\n/g, " ").trim()}</p>`;
  }).join("\n");

  const directionsHTML = directions.map((d, i) => `
    <div style="margin-bottom: 48px; ${i < directions.length - 1 ? "padding-bottom: 40px; border-bottom: 1px solid #DFD9C9;" : ""}">
      <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px;">
        <span style="font-family: monospace; font-size: 11px; letter-spacing: 0.1em; color: #3E7D5A;">0${i + 1}</span>
        <h3 style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em;">${d.name}</h3>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #514E44; margin: 0 0 20px; max-width: 600px;">${d.concept}</p>
      ${d.imageUrl ? `<img src="${d.imageUrl}" alt="Concept visual for ${d.name}" style="width: 100%; max-width: 800px; border-radius: 6px; border: 1px solid #DFD9C9;" />` : `<div style="width: 100%; max-width: 800px; height: 300px; background: #F0EDE4; border-radius: 6px; display: grid; place-items: center; color: #ADA897; font-size: 14px;">Visual generating...</div>`}
      <p style="margin: 10px 0 0; font-size: 12px; color: #ADA897; font-style: italic;">Concept placeholder — licensed imagery for finals</p>
    </div>`).join("\n");

  return `
<div style="font-family: system-ui, -apple-system, sans-serif; color: #17160F; max-width: 860px; margin: 0 auto;">
  <!-- PAGE 1: COVER -->
  <div style="padding: 80px 40px; text-align: center; border-bottom: 2px solid #DFD9C9; margin-bottom: 48px;">
    <p style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #847F71; margin: 0 0 28px;">Spazio — Brand Intelligence Report</p>
    <h1 style="font-size: 48px; font-weight: 600; line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 16px;">${company || "Your Brand"}</h1>
    <p style="font-size: 20px; color: #514E44; margin: 0 0 8px;">${service || "Strategic Brief"}</p>
    <p style="font-size: 13px; color: #ADA897; margin: 28px 0 0;">${date}</p>
  </div>

  <!-- PAGE 2: RESEARCH -->
  <div style="padding: 0 40px 48px; border-bottom: 2px solid #DFD9C9; margin-bottom: 48px;">
    <p style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 28px;">Market & Brand Intelligence</p>
    <div style="color: #17160F;">${researchHTML}</div>
  </div>

  <!-- PAGE 3: CREATIVE DIRECTIONS -->
  <div style="padding: 0 40px 48px; border-bottom: 2px solid #DFD9C9; margin-bottom: 48px;">
    <p style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 12px;">Creative Directions</p>
    <p style="font-size: 15px; color: #847F71; margin: 0 0 36px;">Three strategic territories for your brand. Each takes the research in a distinct visual and emotional direction.</p>
    ${directionsHTML}
  </div>

  <!-- PAGE 4: NEXT STEPS -->
  <div style="padding: 0 40px 48px;">
    <p style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 24px;">Next Steps</p>
    <div style="font-size: 16px; line-height: 1.6; color: #514E44; padding: 24px; background: #FBF9F3; border: 1px solid #DFD9C9; border-radius: 6px;">
      <p style="margin: 0 0 14px;"><strong>1. Review & select</strong> — Choose the direction that resonates, or tell us what to adjust.</p>
      <p style="margin: 0 0 14px;"><strong>2. Design development</strong> — Your Spazio designer builds out the selected direction into a full brand system.</p>
      <p style="margin: 0 0 14px;"><strong>3. Refinement</strong> — Two rounds of refinement to dial in every detail.</p>
      <p style="margin: 0;"><strong>Human-led, AI-accelerated.</strong> The intelligence above was researched and structured by our system — every creative decision is made by a real designer.</p>
    </div>
  </div>
</div>`.trim();
}

export async function POST(request: Request) {
  const atToken = process.env.AIRTABLE_TOKEN;
  const pplxKey = process.env.PERPLEXITY_API_KEY;
  const oaiKey = process.env.OPENAI_API_KEY;
  const asanaToken = process.env.ASANA_TOKEN;

  if (!atToken) return Response.json({ error: "Server not configured." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const reportId = typeof body.reportId === "string" ? body.reportId : "";
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!reportId) return Response.json({ error: "Missing reportId." }, { status: 400 });

  const atHeaders = { Authorization: `Bearer ${atToken}`, "Content-Type": "application/json" };

  // Fetch lead + report data
  let company = "", service = "", email = "", name = "", answers = "{}";
  try {
    const reportRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${reportId}`, { headers: { Authorization: `Bearer ${atToken}` } });
    if (reportRes.ok) {
      const rd = await reportRes.json();
      answers = rd.fields?.["Answers"] || "{}";
      const lLinks = rd.fields?.["Lead"];
      const lid = Array.isArray(lLinks) && lLinks.length ? lLinks[0] : leadId;
      if (lid) {
        const leadRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}/${lid}`, { headers: { Authorization: `Bearer ${atToken}` } });
        if (leadRes.ok) {
          const ld = await leadRes.json();
          name = ld.fields?.["Name"] || "";
          company = ld.fields?.["Company "] || ld.fields?.["Company"] || "";
          email = ld.fields?.["Email "] || ld.fields?.["Email"] || "";
          const svc = ld.fields?.["Service Interest"];
          service = typeof svc === "object" && svc?.name ? svc.name : (typeof svc === "string" ? svc : "");
        }
      }
    }
  } catch (err) { console.error("Data fetch failed", err); }

  // Parse answers for extra context
  let parsedAnswers: Record<string, string> = {};
  try { parsedAnswers = JSON.parse(answers); } catch {}

  // === 1. PERPLEXITY RESEARCH ===
  let research = "Research generation pending.";
  if (pplxKey) {
    try {
      research = await runResearch(company, service, answers, pplxKey);
    } catch (err) { console.error("Research failed", err); }
  }

  // === 2. OPENAI CREATIVE DIRECTIONS ===
  let directions: Array<{name: string; concept: string; visualPrompt: string}> = [];
  if (oaiKey) {
    try {
      directions = await generateDirections(company, research, oaiKey);
    } catch (err) { console.error("Directions failed", err); }
  }
  // Fallback
  if (!directions.length) {
    directions = [
      { name: "Direction A", concept: "A bold, confident approach emphasizing authority and trust.", visualPrompt: "" },
      { name: "Direction B", concept: "A warm, approachable direction focused on human connection.", visualPrompt: "" },
      { name: "Direction C", concept: "A minimal, modern aesthetic that lets the work speak.", visualPrompt: "" },
    ];
  }

  // === 3. DALL·E VISUALS (parallel) ===
  const directionsWithImages = await Promise.all(directions.map(async (d) => {
    let imageUrl = "";
    if (oaiKey && d.visualPrompt) {
      try { imageUrl = await generateVisual(d.visualPrompt, oaiKey); }
      catch (err) { console.error(`Visual failed for ${d.name}`, err); }
    }
    return { name: d.name, concept: d.concept, imageUrl };
  }));

  // === 4. BUILD DECK ===
  const deckHTML = buildDeckHTML(company, service, research, directionsWithImages);

  // === 5. STORE IN AIRTABLE ===
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH", headers: atHeaders,
      body: JSON.stringify({ records: [{ id: reportId, fields: {
        [REPORT_FIELDS.briefHTML]: deckHTML,
        [REPORT_FIELDS.status]: "Review Pending",
      }}], typecast: true }),
    });
  } catch (err) { console.error("Deck save failed", err); }

  // === 6. ASANA TASK ===
  if (asanaToken) {
    try {
      await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: {
          name: `Review deck: ${company || name}`,
          notes: `Full brand intelligence deck ready for review.\n\nClient: ${name}\nEmail: ${email}\nCompany: ${company}\nService: ${service}\nDirections: ${directionsWithImages.map(d => d.name).join(", ")}\n\nAirtable Report ID: ${reportId}\nClient review link: https://www.spaziographics.com/#review=${reportId}`,
          projects: [ASANA_PROJECT],
          due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        }}),
      });
    } catch (err) { console.error("Asana task failed", err); }
  }

  return Response.json({ ok: true });
}
