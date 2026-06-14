// Foundation questionnaire endpoint.
// Saves answers to the "Brand Intelligence Reports" table in Airtable,
// linked to an existing Leads record.

const AIRTABLE_URL =
  "https://api.airtable.com/v0/appv2sIRwDvNPjV7j/tbl7hxUDQRJLjUpKQ";

// Field IDs for Brand Intelligence Reports
const FIELDS = {
  reportId: "fldDIew0Hh6uWyy7Z",
  lead:     "flduD1QjX8XxucINU",
  answers:  "fldgTPk5L6fnvZzZo",
  status:   "fldLUKmsHhqidDFWb",
} as const;

type Answers = {
  shaping?:       Record<string, unknown>;
  direction?:     Record<string, unknown>;
  visualLanguage?: Record<string, unknown>;
  output?:        Record<string, unknown>;
  context?:       Record<string, unknown>;
};

type FoundationInput = {
  leadId?:  string;
  answers?: Answers;
};

async function parseBody(request: Request): Promise<FoundationInput> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as FoundationInput;
  }
  return {};
}

function makeReportId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `BIR-${ts}`;
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    console.error("AIRTABLE_TOKEN is not configured");
    return Response.json(
      { error: "Server is not configured to accept submissions." },
      { status: 500 },
    );
  }

  let input: FoundationInput;
  try {
    input = await parseBody(request);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!input.leadId) {
    return Response.json({ error: "leadId is required." }, { status: 400 });
  }

  if (!input.answers || typeof input.answers !== "object") {
    return Response.json({ error: "answers object is required." }, { status: 400 });
  }

  const fields: Record<string, unknown> = {
    [FIELDS.reportId]: makeReportId(),
    [FIELDS.lead]:     [input.leadId],
    [FIELDS.answers]:  JSON.stringify(input.answers, null, 2),
    [FIELDS.status]:   "Draft",
  };

  let airtableResponse: Response;
  try {
    airtableResponse = await fetch(AIRTABLE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });
  } catch (error) {
    console.error("Failed to reach Airtable", error);
    return Response.json(
      { error: "Could not save your brief. Please try again." },
      { status: 502 },
    );
  }

  if (!airtableResponse.ok) {
    const detail = await airtableResponse.text();
    console.error(`Airtable responded ${airtableResponse.status}: ${detail}`);
    return Response.json(
      { error: "Could not save your brief. Please try again." },
      { status: 502 },
    );
  }

  const data = (await airtableResponse.json()) as {
    records: Array<{ id: string }>;
  };
  const id = data.records?.[0]?.id ?? null;

  return Response.json({ ok: true, id }, { status: 201 });
}
