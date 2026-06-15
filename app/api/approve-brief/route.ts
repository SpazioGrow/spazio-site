// Approve brief endpoint — marks the Brand Intelligence Report as Complete.

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    console.error("AIRTABLE_TOKEN not configured");
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
  if (!reportId) {
    return Response.json({ error: "reportId is required." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              id: reportId,
              fields: { "Status": "Complete" },
            },
          ],
          typecast: true,
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error(`Airtable approve ${res.status}: ${detail}`);
      return Response.json({ error: "Could not update status." }, { status: 502 });
    }
  } catch (err) {
    console.error("Airtable approve failed", err);
    return Response.json({ error: "Could not reach database." }, { status: 502 });
  }

  return Response.json({ ok: true, message: "Brief approved and marked complete." }, { status: 200 });
}
