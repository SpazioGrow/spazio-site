// Review endpoint — fetches brief HTML for client review page.
// Also handles client actions: approve or request changes.

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const REPORT_FIELDS = {
  status: "fldLUKmsHhqidDFWb",
  briefHTML: "fld3ZgwxOlFRK27Qx",
  reportId: "fldDIew0Hh6uWyy7Z",
} as const;

export async function GET(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return Response.json({ error: "Server not configured." }, { status: 500 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing report ID." }, { status: 400 });

  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return Response.json({ error: "Report not found." }, { status: 404 });
    const data = await res.json();
    return Response.json({
      ok: true,
      briefHTML: data.fields?.["Brief HTML"] || "",
      status: data.fields?.["Status"] || "Unknown",
      ref: data.fields?.["Report ID"] || "",
    });
  } catch { return Response.json({ error: "Could not fetch report." }, { status: 502 }); }
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return Response.json({ error: "Server not configured." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action : "";
  const feedback = typeof body.feedback === "string" ? body.feedback : "";
  if (!id || !action) return Response.json({ error: "Missing id or action." }, { status: 400 });

  const newStatus = action === "approve" ? "Client Approved" : "Changes Requested";

  try {
    const fields: Record<string, unknown> = { [REPORT_FIELDS.status]: newStatus };
    await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
    });
  } catch { return Response.json({ error: "Could not update." }, { status: 502 }); }

  // If changes requested, create Asana task with feedback
  if (action === "changes" && feedback) {
    const asanaToken = process.env.ASANA_TOKEN;
    if (asanaToken) {
      try {
        await fetch("https://app.asana.com/api/1.0/tasks", {
          method: "POST",
          headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ data: {
            name: `Client revision request: ${id}`,
            notes: `Client requested changes:\n\n${feedback}\n\nReport ID: ${id}`,
            projects: ["1215677774689770"],
            due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
          }}),
        });
      } catch { /* non-blocking */ }
    }
  }

  return Response.json({ ok: true, status: newStatus });
}
