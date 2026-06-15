// Brief generation endpoint.
// Fetches report from Airtable, calls Perplexity for strategy, builds 3-page HTML brief.

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";

const REPORT_FIELDS = {
  answers: "fldgTPk5L6fnvZzZo",
  status: "fldLUKmsHhqidDFWb",
  briefHTML: "fld3ZgwxOlFRK27Qx",
  lead: "flduD1QjX8XxucINU",
} as const;

const LEAD_FIELDS = {
  name: "fldcNCcvpv3UYK7sR",
  company: "fldK7UmiFjbqxuibh",
  service: "fld15eMrZbh2n8Kev",
} as const;

async function airtableGet(table: string, recordId: string, token: string) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}/${recordId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

function buildBriefHTML(company: string, service: string, strategy: string): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `
<div style="font-family: system-ui, -apple-system, sans-serif; color: #17160F; max-width: 800px; margin: 0 auto;">
  <div style="padding: 60px 40px; text-align: center; border-bottom: 2px solid #DFD9C9; margin-bottom: 40px;">
    <p style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #847F71; margin: 0 0 24px;">Spazio — Brand Intelligence Report</p>
    <h1 style="font-size: 42px; font-weight: 600; line-height: 1.05; letter-spacing: -0.025em; margin: 0 0 16px;">${company || "Your Brand"}</h1>
    <p style="font-size: 18px; color: #514E44; margin: 0 0 8px;">${service || "Strategic Brief"}</p>
    <p style="font-size: 13px; color: #ADA897; margin: 24px 0 0;">${date}</p>
  </div>
  <div style="padding: 0 40px 40px; border-bottom: 2px solid #DFD9C9; margin-bottom: 40px;">
    <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 20px;">Strategy & Positioning</p>
    <div style="font-size: 16px; line-height: 1.65; color: #17160F;">${strategy}</div>
  </div>
  <div style="padding: 0 40px 40px;">
    <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 20px;">Creative Direction</p>
    <div style="font-size: 15px; line-height: 1.6; color: #514E44; padding: 20px; background: #FBF9F3; border: 1px solid #DFD9C9; border-radius: 4px;">
      <p style="margin: 0 0 12px;"><strong>Next steps:</strong> A Spazio designer will review this brief and develop visual directions based on the strategy above.</p>
      <p style="margin: 0;"><strong>Human-led, AI-accelerated.</strong> Every creative decision is made by a real designer.</p>
    </div>
  </div>
</div>`.trim();
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (!token) return Response.json({ error: "Server not configured." }, { status: 500 });
  if (!perplexityKey) return Response.json({ error: "Server not configured (Perplexity)." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
  if (!reportId) return Response.json({ error: "reportId is required." }, { status: 400 });

  // 1. Fetch report
  let answers = "{}";
  let leadId = "";
  try {
    const data = await airtableGet(REPORTS_TABLE, reportId, token);
    answers = data.fields?.[REPORT_FIELDS.answers] || "{}";
    const leadLinks = data.fields?.[REPORT_FIELDS.lead];
    if (Array.isArray(leadLinks) && leadLinks.length) leadId = leadLinks[0];
  } catch (err) {
    console.error("Report fetch failed", err);
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  // 2. Fetch linked lead for company + service
  let company = "";
  let service = "";
  if (leadId) {
    try {
      const data = await airtableGet(LEADS_TABLE, leadId, token);
      company = data.fields?.[LEAD_FIELDS.company] || "";
      service = data.fields?.[LEAD_FIELDS.service]?.name || data.fields?.[LEAD_FIELDS.service] || "";
    } catch { /* proceed without */ }
  }

  // 3. Call Perplexity
  let strategy: string;
  try {
    const prompt = `You are a senior brand strategist at a high-end design agency. Based on the following client intake, write a concise strategic brief (3-5 paragraphs). Cover: market positioning, competitive landscape, key opportunities, and recommended brand direction. Be specific, opinionated, and actionable.

Company: ${company}
Service interest: ${service}
Questionnaire responses: ${answers}

Write in clear, professional prose. No markdown headers. No bullet points. Just sharp strategic thinking.`;

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }], max_tokens: 1200 }),
    });

    if (!res.ok) {
      strategy = "<p>Strategy generation temporarily unavailable. A Spazio strategist will prepare this manually.</p>";
    } else {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "";
      strategy = raw.split(/\n\n+/).filter((p: string) => p.trim()).map((p: string) => `<p style="margin: 0 0 16px;">${p.trim()}</p>`).join("\n");
    }
  } catch {
    strategy = "<p>Strategy generation encountered an error.</p>";
  }

  // 4. Build brief + save to Airtable
  const briefHTML = buildBriefHTML(company, service, strategy);
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        records: [{ id: reportId, fields: { [REPORT_FIELDS.briefHTML]: briefHTML, [REPORT_FIELDS.status]: "Review Pending" } }],
        typecast: true,
      }),
    });
  } catch { /* brief still returned even if save fails */ }

  return Response.json({ ok: true, briefHTML }, { status: 200 });
}
