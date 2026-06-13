// Lead capture endpoint for the "Start a Project" form.
// Runs server-side only so AIRTABLE_TOKEN is never exposed to the browser.

const AIRTABLE_URL =
  "https://api.airtable.com/v0/appv2sIRwDvNPjV7j/tbl5qLZO9mAN9LQ0P";

// Airtable field NAMES have trailing spaces, so we address fields by ID.
const FIELD_IDS = {
  name: "fldcNCcvpv3UYK7sR",
  email: "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh",
  website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev",
  source: "fldD97lODtKXRBp57",
} as const;

type LeadInput = {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  service?: string;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function parseBody(request: Request): Promise<LeadInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await request.json()) as Record<string, unknown>;
    return {
      name: readString(data.name),
      email: readString(data.email),
      company: readString(data.company),
      website: readString(data.website),
      // Accept a few likely keys for the service interest field.
      service: readString(
        data.service ?? data.serviceInterest ?? data["service interest"],
      ),
    };
  }

  // Fall back to form-encoded / multipart submissions.
  const form = await request.formData();
  return {
    name: readString(form.get("name")),
    email: readString(form.get("email")),
    company: readString(form.get("company")),
    website: readString(form.get("website")),
    service: readString(
      form.get("service") ??
        form.get("serviceInterest") ??
        form.get("service interest"),
    ),
  };
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

  let input: LeadInput;
  try {
    input = await parseBody(request);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = input.name ?? "";
  const email = input.email ?? "";
  if (!name || !email) {
    return Response.json(
      { error: "Name and email are required." },
      { status: 400 },
    );
  }

  // Build the fields object with only the values we actually have.
  const fields: Record<string, string> = {
    [FIELD_IDS.name]: name,
    [FIELD_IDS.email]: email,
    [FIELD_IDS.source]: "Website Form",
  };
  if (input.company) fields[FIELD_IDS.company] = input.company;
  if (input.website) fields[FIELD_IDS.website] = input.website;
  if (input.service) fields[FIELD_IDS.service] = input.service;

  let airtableResponse: Response;
  try {
    airtableResponse = await fetch(AIRTABLE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{ fields }],
        typecast: true,
      }),
    });
  } catch (error) {
    console.error("Failed to reach Airtable", error);
    return Response.json(
      { error: "Could not submit your request. Please try again." },
      { status: 502 },
    );
  }

  if (!airtableResponse.ok) {
    // Log the upstream detail server-side; keep the client response generic.
    const detail = await airtableResponse.text();
    console.error(
      `Airtable responded ${airtableResponse.status}: ${detail}`,
    );
    return Response.json(
      { error: "Could not submit your request. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
