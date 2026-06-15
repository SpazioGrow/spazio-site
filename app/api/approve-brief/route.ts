// Approve brief endpoint.
// Sets the Brand Intelligence Report status to "Complete".

const REPORTS_URL = "https://api.airtable.com/v0/appv2sIRwDvNPjV7j/tbl7hxUDQRJLjUpKQ";
const STATUS_FIELD = "fldLUKmsHhqidDFWb";

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: { reportId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.reportId) {
    return Response.json({ error: "reportId is required." }, { status: 400 });
  }

  const res = await fetch(`${REPORTS_URL}/${body.reportId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: { [STATUS_FIELD]: "Complete" } }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`Airtable PATCH ${res.status}: ${detail}`);
    return Response.json({ error: "Could not update brief status." }, { status: 502 });
  }

  return Response.json({ ok: true, message: "Brief approved and marked complete." });
}
