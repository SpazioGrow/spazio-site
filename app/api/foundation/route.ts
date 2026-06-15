// Foundation endpoint — full pipeline:
// 1. Create Lead in Airtable
// 2. Create Brand Intelligence Report in Airtable
// 3. Call Perplexity for strategy brief
// 4. Store brief HTML in Airtable
// 5. Create Asana review task

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_PROJECT = "1215677774689770";

const LEAD_FIELDS = {
  name: "fldcNCcvpv3UYK7sR",
  email: "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh",
  website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev",
  source: "fldD97lODtKXRBp57",
} as const;

const REPORT_FIELDS = {
  reportId: "fldDIew0Hh6uWyy7Z",
  lead: "flduD1QjX8XxucINU",
  answers: "fldgTPk5L6fnvZzZo",
  status: "fldLUKmsHhqidDFWb",
  briefHTML: "fld3ZgwxOlFRK27Qx",
} as const;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
  if (!token) return Response.json({ error: "Server not configured." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const name = str(body.name);
  const email = str(body.email);
  const company = str(body.company);
  const service = str(body.service);
  if (!name || !email) return Response.json({ error: "Name and email are required." }, { status: 400 });

  const atHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // === 1. CREATE LEAD ===
  const leadFields: Record<string, string> = {
    [LEAD_FIELDS.name]: name, [LEAD_FIELDS.email]: email, [LEAD_FIELDS.source]: "Foundation Form",
  };
  if (company) leadFields[LEAD_FIELDS.company] = company;
  if (str(body.website)) leadFields[LEAD_FIELDS.website] = str(body.website);
  if (service) leadFields[LEAD_FIELDS.service] = service;

  let leadId: string;
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}`, {
      method: "POST", headers: atHeaders,
      body: JSON.stringify({ records: [{ fields: leadFields }], typecast: true }),
    });
    if (!res.ok) { console.error("Lead create failed:", await res.text()); return Response.json({ error: "Could not save lead." }, { status: 502 }); }
    leadId = (await res.json()).records[0].id;
  } catch (err) { console.error("Lead fetch failed", err); return Response.json({ error: "Could not reach database." }, { status: 502 }); }

  // === 2. CREATE REPORT ===
  const questionnaire = body.questionnaire ?? {};
  const allAnswers = { company, service, email, ...questionnaire as object };
  const ref = (company || name).replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();

  let reportRecordId: string;
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "POST", headers: atHeaders,
      body: JSON.stringify({ records: [{ fields: {
        [REPORT_FIELDS.reportId]: ref, [REPORT_FIELDS.lead]: [leadId],
        [REPORT_FIELDS.answers]: JSON.stringify(allAnswers), [REPORT_FIELDS.status]: "New",
      }}], typecast: true }),
    });
    if (!res.ok) { console.error("Report create failed:", await res.text()); return Response.json({ error: "Could not create report." }, { status: 502 }); }
    reportRecordId = (await res.json()).records[0].id;
  } catch (err) { console.error("Report fetch failed", err); return Response.json({ error: "Could not reach database." }, { status: 502 }); }

  // === 3. GENERATE BRIEF VIA PERPLEXITY ===
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  let strategy = "<p>Brief generation pending — a Spazio strategist will complete this section.</p>";
  if (perplexityKey) {
    try {
      const prompt = `You are a senior brand strategist at a high-end design agency. Based on the following client intake, write a concise strategic brief (3-5 paragraphs). Cover: market positioning, competitive landscape, key opportunities, and recommended brand direction. Be specific, opinionated, and actionable.\n\nCompany: ${company}\nService interest: ${service}\nQuestionnaire responses: ${JSON.stringify(allAnswers)}\n\nWrite in clear, professional prose. No markdown headers. No bullet points.`;
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: prompt }], max_tokens: 1200 }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? "";
        strategy = raw.split(/\n\n+/).filter((p: string) => p.trim()).map((p: string) => `<p style="margin: 0 0 16px;">${p.trim()}</p>`).join("\n");
      } else { console.error("Perplexity error:", res.status, await res.text()); }
    } catch (err) { console.error("Perplexity call failed", err); }
  }

  // === 4. STORE BRIEF IN AIRTABLE ===
  const briefHTML = buildBriefHTML(company, service, strategy);
  try {
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH", headers: atHeaders,
      body: JSON.stringify({ records: [{ id: reportRecordId, fields: {
        [REPORT_FIELDS.briefHTML]: briefHTML, [REPORT_FIELDS.status]: "Review Pending",
      }}], typecast: true }),
    });
  } catch (err) { console.error("Brief save failed", err); }

  // === 5. CREATE ASANA REVIEW TASK ===
  const asanaToken = process.env.ASANA_TOKEN;
  if (asanaToken) {
    try {
      await fetch("https://app.asana.com/api/1.0/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ data: {
          name: `Review brief: ${company || name}`,
          notes: `New brand intelligence report ready for review.\n\nClient: ${name}\nEmail: ${email}\nCompany: ${company}\nService: ${service}\n\nAirtable Report ID: ${reportRecordId}\nClient review link: https://www.spaziographics.com/#review=${reportRecordId}`,
          projects: [ASANA_PROJECT],
          due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        }}),
      });
    } catch (err) { console.error("Asana task failed", err); }
  }

  return Response.json({ ok: true, leadId, reportId: reportRecordId }, { status: 201 });
}
