// Lead capture endpoint for the "Start a Project" form.
// Runs server-side only so AIRTABLE_TOKEN is never exposed to the browser.
// On success it also drops a card into the Asana "Sales Pipeline" (New Inquiry).
import { waitUntil } from "@vercel/functions";

const AIRTABLE_URL =
  "https://api.airtable.com/v0/appv2sIRwDvNPjV7j/tbl5qLZO9mAN9LQ0P";

// Asana Sales Pipeline — new website inquiries land in the "New Inquiry" section.
const ASANA_SALES_PROJECT = "1216493114076820";
const ASANA_NEW_INQUIRY_SECTION = "1216493114084534";

// Airtable field NAMES have trailing spaces, so we address fields by ID.
const FIELD_IDS = {
  name: "fldcNCcvpv3UYK7sR",
  email: "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh",
  website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev",
  source: "fldD97lODtKXRBp57",
  notes: "fld3V6uS3RfOxS8ZV",
} as const;

// Every submission from the public Start-a-Project page is tagged with this Source.
const LEAD_SOURCE = "Start a Project";

type LeadInput = {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  service?: string;
  message?: string;
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
      message: readString(data.message ?? data.details ?? data.notes),
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
    message: readString(form.get("message") ?? form.get("details")),
  };
}

// Fire-and-forget: create a card in the Asana Sales Pipeline ("New Inquiry").
// Never blocks or fails the lead capture — logs and moves on.
async function createSalesTask(lead: {
  name: string; email: string; company: string; website: string; service: string; message: string;
}) {
  const asanaToken = process.env.ASANA_TOKEN;
  if (!asanaToken) { console.error("ASANA_TOKEN missing — skipping Sales Pipeline card"); return; }

  const notes =
    `New website inquiry — Start a Project.\n\n` +
    `Name: ${lead.name}\n` +
    `Email: ${lead.email}\n` +
    (lead.company ? `Company: ${lead.company}\n` : "") +
    (lead.website ? `Website: ${lead.website}\n` : "") +
    (lead.service ? `Interest: ${lead.service}\n` : "") +
    (lead.message ? `\nProject notes:\n${lead.message}\n` : "");
  const taskName = `New inquiry — ${lead.name}${lead.company ? ` (${lead.company})` : ""}`;
  const headers = { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" };

  try {
    const res = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST", headers,
      body: JSON.stringify({ data: { name: taskName, notes, projects: [ASANA_SALES_PROJECT] } }),
    });
    if (!res.ok) { console.error("Asana task create failed:", res.status, await res.text().catch(() => "")); return; }
    const taskId = (await res.json())?.data?.gid;
    if (taskId) {
      const mv = await fetch(`https://app.asana.com/api/1.0/sections/${ASANA_NEW_INQUIRY_SECTION}/addTask`, {
        method: "POST", headers, body: JSON.stringify({ data: { task: taskId } }),
      });
      if (!mv.ok) console.error("Asana move-to-section failed:", mv.status, await mv.text().catch(() => ""));
    }
  } catch (e) { console.error("Asana Sales Pipeline error:", (e as Error).message); }
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
    [FIELD_IDS.source]: LEAD_SOURCE,
  };
  if (input.company) fields[FIELD_IDS.company] = input.company;
  if (input.website) fields[FIELD_IDS.website] = input.website;
  if (input.service) fields[FIELD_IDS.service] = input.service;
  if (input.message) fields[FIELD_IDS.notes] = input.message;

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

  // Lead is saved. Drop a Sales Pipeline card in the background (never blocks).
  waitUntil(createSalesTask({
    name, email,
    company: input.company ?? "", website: input.website ?? "",
    service: input.service ?? "", message: input.message ?? "",
  }));

  return Response.json({ ok: true }, { status: 201 });
}
