// Deck viewer — serves a report's Brief HTML as a rendered web page.
// Airtable shows the Brief HTML field as raw source; this route wraps that
// self-contained HTML in a full document and returns it as text/html so the
// link just opens the rendered visual deck in a browser.
//   GET /api/deck?id=<reportId>

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function airtableGet(table: string, id: string, token: string) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  return res.json();
}

function page(title: string, bodyHTML: string): string {
  // Cream surface background matches the deck's own canvas (renderAuditHTML).
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(title)}</title>
<style>
  html,body{margin:0;padding:0;background:#FAF8F2;}
  body{padding:24px 16px;}
  @media print{body{padding:0;}}
</style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
}

export async function GET(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return new Response("Server not configured.", { status: 500, headers: { "Content-Type": "text/plain" } });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing report id (?id=…).", { status: 400, headers: { "Content-Type": "text/plain" } });

  let briefHTML = "";
  let ref = "";
  let leadId = "";
  try {
    const data = await airtableGet(REPORTS_TABLE, id, token);
    briefHTML = data.fields?.["Brief HTML"] || "";
    ref = data.fields?.["Report ID"] || "";
    const leadLinks = data.fields?.["Lead"];
    if (Array.isArray(leadLinks) && leadLinks.length) leadId = leadLinks[0];
  } catch {
    return new Response("Report not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  if (!briefHTML) {
    return new Response("This report has no deck yet — it may still be generating.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  let company = "";
  if (leadId) {
    try {
      const ld = await airtableGet(LEADS_TABLE, leadId, token);
      company = ld.fields?.["Company "] || ld.fields?.["Company"] || "";
    } catch { /* title falls back to ref */ }
  }

  const title = `${company || "Brand"} — Spazio Brand Audit${ref ? ` (${ref})` : ""}`;
  return new Response(page(title, briefHTML), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
