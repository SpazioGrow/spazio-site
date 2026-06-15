// Foundation questionnaire endpoint.
// Creates a Lead record then a Brand Intelligence Report linked to it.
// Returns { ok, leadId, reportId }.

const BASE = "https://api.airtable.com/v0/appv2sIRwDvNPjV7j";
const LEADS_URL   = `${BASE}/tbl5qLZO9mAN9LQ0P`;
const REPORTS_URL = `${BASE}/tbl7hxUDQRJLjUpKQ`;

// Lead field IDs
const LF = {
  name:    "fldcNCcvpv3UYK7sR",
  email:   "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh",
  website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev",
  source:  "fldD97lODtKXRBp57",
} as const;

// Brand Intelligence Reports field IDs
const RF = {
  reportId: "fldDIew0Hh6uWyy7Z",
  lead:     "flduD1QjX8XxucINU",
  answers:  "fldgTPk5L6fnvZzZo",
  status:   "fldLUKmsHhqidDFWb",
} as const;

type Answers = {
  shaping?:        Record<string, unknown>;
  direction?:      Record<string, unknown>;
  visualLanguage?: Record<string, unknown>;
  output?:         Record<string, unknown>;
  context?:        Record<string, unknown>;
};

type FoundationInput = {
  name?:    string;
  email?:   string;
  company?: string;
  service?: string;
  website?: string;
  answers?: Answers;
};

async function parseBody(request: Request): Promise<FoundationInput> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await request.json()) as FoundationInput;
  return {};
}

function makeReportId(): string {
  return `BIR-${Date.now().toString(36).toUpperCase()}`;
}

async function atPost(url: string, fields: Record<string, unknown>, token: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Airtable ${res.status}: ${detail}`);
  }
  const data = (await res.json()) as { records: Array<{ id: string }> };
  return data.records?.[0]?.id ?? null;
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return Response.json({ error: "Server is not configured to accept submissions." }, { status: 500 });
  }

  let input: FoundationInput;
  try {
    input = await parseBody(request);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!input.email) {
    return Response.json({ error: "email is required." }, { status: 400 });
  }

  // 1. Create Lead
  const leadFields: Record<string, unknown> = {
    [LF.source]: "Website Form",
  };
  if (input.name)    leadFields[LF.name]    = input.name;
  if (input.email)   leadFields[LF.email]   = input.email;
  if (input.company) leadFields[LF.company] = input.company;
  if (input.website) leadFields[LF.website] = input.website;
  if (input.service) leadFields[LF.service] = input.service;

  let leadId: string | null;
  try {
    leadId = await atPost(LEADS_URL, leadFields, token);
  } catch (error) {
    console.error("Failed to create lead", error);
    return Response.json({ error: "Could not save your information. Please try again." }, { status: 502 });
  }

  if (!leadId) {
    return Response.json({ error: "Could not create lead record." }, { status: 502 });
  }

  // 2. Create Brand Intelligence Report
  const reportFields: Record<string, unknown> = {
    [RF.reportId]: makeReportId(),
    [RF.lead]:     [leadId],
    [RF.status]:   "Draft",
  };
  if (input.answers && typeof input.answers === "object") {
    reportFields[RF.answers] = JSON.stringify(input.answers, null, 2);
  }

  let reportId: string | null;
  try {
    reportId = await atPost(REPORTS_URL, reportFields, token);
  } catch (error) {
    console.error("Failed to create report", error);
    return Response.json({ error: "Could not save your brief. Please try again." }, { status: 502 });
  }

  return Response.json({ ok: true, leadId, reportId }, { status: 201 });
}
