// Foundation form endpoint — creates a Lead and a Brand Intelligence Report in Airtable.

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";

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
} as const;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    console.error("AIRTABLE_TOKEN is not configured");
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = str(body.name);
  const email = str(body.email);
  const company = str(body.company);
  const service = str(body.service);
  if (!name || !email) {
    return Response.json({ error: "Name and email are required." }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Create Lead record
  const leadFields: Record<string, string> = {
    [LEAD_FIELDS.name]: name,
    [LEAD_FIELDS.email]: email,
    [LEAD_FIELDS.source]: "Foundation Form",
  };
  if (company) leadFields[LEAD_FIELDS.company] = company;
  if (str(body.website)) leadFields[LEAD_FIELDS.website] = str(body.website);
  if (service) leadFields[LEAD_FIELDS.service] = service;

  let leadId: string;
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ records: [{ fields: leadFields }], typecast: true }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error(`Airtable Leads ${res.status}: ${detail}`);
      return Response.json({ error: "Could not save lead." }, { status: 502 });
    }
    const data = await res.json();
    leadId = data.records[0].id;
  } catch (err) {
    console.error("Airtable Leads fetch failed", err);
    return Response.json({ error: "Could not reach database." }, { status: 502 });
  }

  // 2. Create Brand Intelligence Report using correct field IDs
  const questionnaire = body.questionnaire ?? {};
  const allAnswers = { company, service, email, ...questionnaire };
  const ref = (company || name).replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();

  const reportFields: Record<string, unknown> = {
    [REPORT_FIELDS.reportId]: ref,
    [REPORT_FIELDS.lead]: [leadId],
    [REPORT_FIELDS.answers]: JSON.stringify(allAnswers),
    [REPORT_FIELDS.status]: "New",
  };

  let reportId: string;
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ records: [{ fields: reportFields }], typecast: true }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error(`Airtable Reports ${res.status}: ${detail}`);
      return Response.json({ ok: true, leadId, reportId: null, warning: "Lead saved but report creation failed: " + detail }, { status: 201 });
    }
    const data = await res.json();
    reportId = data.records[0].id;
  } catch (err) {
    console.error("Airtable Reports fetch failed", err);
    return Response.json({ ok: true, leadId, reportId: null, warning: "Lead saved but report creation failed." }, { status: 201 });
  }

  return Response.json({ ok: true, leadId, reportId }, { status: 201 });
}
