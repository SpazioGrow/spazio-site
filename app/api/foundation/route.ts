// Foundation endpoint — creates Lead + Report, returns fast.
// The heavy pipeline (research/visuals/deck) runs via /api/generate-deck.

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";

const LEAD_FIELDS = {
  name: "fldcNCcvpv3UYK7sR", email: "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh", website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev", source: "fldD97lODtKXRBp57",
} as const;

const REPORT_FIELDS = {
  reportId: "fldDIew0Hh6uWyy7Z", lead: "flduD1QjX8XxucINU",
  answers: "fldgTPk5L6fnvZzZo", status: "fldLUKmsHhqidDFWb",
} as const;

function str(v: unknown): string { return typeof v === "string" ? v.trim() : ""; }

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return Response.json({ error: "Server not configured." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const name = str(body.name), email = str(body.email), company = str(body.company), service = str(body.service);
  if (!name || !email) return Response.json({ error: "Name and email are required." }, { status: 400 });

  // Comped (free test-run) audits are tagged distinctly so they're filterable from paid.
  const comped = body.comped === true;

  const atHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Create Lead
  const leadFields: Record<string, string> = {
    [LEAD_FIELDS.name]: name, [LEAD_FIELDS.email]: email,
    [LEAD_FIELDS.source]: comped ? "Comp / Test" : "Foundation Form",
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
    if (!res.ok) { console.error("Lead failed:", await res.text()); return Response.json({ error: "Could not save lead." }, { status: 502 }); }
    leadId = (await res.json()).records[0].id;
  } catch { return Response.json({ error: "Could not reach database." }, { status: 502 }); }

  // Create Report
  const questionnaire = body.questionnaire ?? {};
  const allAnswers = { company, service, email, comped, ...questionnaire as object };
  const ref = (company || name).replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();

  let reportId: string;
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "POST", headers: atHeaders,
      body: JSON.stringify({ records: [{ fields: {
        [REPORT_FIELDS.reportId]: ref, [REPORT_FIELDS.lead]: [leadId],
        [REPORT_FIELDS.answers]: JSON.stringify(allAnswers), [REPORT_FIELDS.status]: "Generating",
      }}], typecast: true }),
    });
    if (!res.ok) { console.error("Report failed:", await res.text()); return Response.json({ error: "Could not create report." }, { status: 502 }); }
    reportId = (await res.json()).records[0].id;
  } catch { return Response.json({ error: "Could not reach database." }, { status: 502 }); }

  return Response.json({ ok: true, leadId, reportId }, { status: 201 });
}
