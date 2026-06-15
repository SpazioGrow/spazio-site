// Brief generation endpoint.
// Fetches lead + report from Airtable, calls Perplexity for strategy, builds 3-page HTML brief.

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";

async function airtableFetch(path: string, token: string, opts?: RequestInit) {
  return fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
  });
}

function buildBriefHTML(company: string, service: string, strategy: string): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `
<div style="font-family: system-ui, -apple-system, sans-serif; color: #17160F; max-width: 800px; margin: 0 auto;">
  <!-- Page 1: Cover -->
  <div style="padding: 60px 40px; text-align: center; border-bottom: 2px solid #DFD9C9; margin-bottom: 40px;">
    <p style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #847F71; margin: 0 0 24px;">Spazio — Brand Intelligence Report</p>
    <h1 style="font-size: 42px; font-weight: 600; line-height: 1.05; letter-spacing: -0.025em; margin: 0 0 16px;">${company || "Your Brand"}</h1>
    <p style="font-size: 18px; color: #514E44; margin: 0 0 8px;">${service || "Strategic Brief"}</p>
    <p style="font-size: 13px; color: #ADA897; margin: 24px 0 0;">${date}</p>
  </div>

  <!-- Page 2: Strategy -->
  <div style="padding: 0 40px 40px; border-bottom: 2px solid #DFD9C9; margin-bottom: 40px;">
    <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 20px;">Strategy & Positioning</p>
    <div style="font-size: 16px; line-height: 1.65; color: #17160F;">
      ${strategy}
    </div>
  </div>

  <!-- Page 3: Creative Direction -->
  <div style="padding: 0 40px 40px;">
    <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #3E7D5A; margin: 0 0 20px;">Creative Direction</p>
    <div style="font-size: 15px; line-height: 1.6; color: #514E44; padding: 20px; background: #FBF9F3; border: 1px solid #DFD9C9; border-radius: 4px;">
      <p style="margin: 0 0 12px;"><strong>Next steps:</strong> A Spazio designer will review this brief and develop visual directions based on the strategy above. You'll receive 2–3 creative territories to choose from.</p>
      <p style="margin: 0;"><strong>Human-led, AI-accelerated.</strong> The intelligence above was researched and structured by our system — every creative decision is made by a real designer.</p>
    </div>
  </div>
</div>`.trim();
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (!token) {
    console.error("AIRTABLE_TOKEN not configured");
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }
  if (!perplexityKey) {
    console.error("PERPLEXITY_API_KEY not configured");
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

  // 1. Fetch the report record from Airtable
  let report: Record<string, unknown>;
  try {
    const res = await airtableFetch(`${REPORTS_TABLE}/${reportId}`, token);
    if (!res.ok) {
      const detail = await res.text();
      console.error(`Airtable report fetch ${res.status}: ${detail}`);
      return Response.json({ error: "Report not found." }, { status: 404 });
    }
    const data = await res.json();
    report = (data.fields ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.error("Failed to fetch report", err);
    return Response.json({ error: "Could not reach database." }, { status: 502 });
  }

  const company = String(report["Company"] ?? "");
  const service = String(report["Service Interest"] ?? "");
  const questionnaire = String(report["Questionnaire JSON"] ?? "{}");

  // 2. Call Perplexity to generate strategy
  let strategy: string;
  try {
    const prompt = `You are a senior brand strategist at a high-end design agency. Based on the following client intake, write a concise strategic brief (3–5 paragraphs). Cover: market positioning, competitive landscape, key opportunities, and recommended brand direction. Be specific, opinionated, and actionable — no filler.

Company: ${company}
Service interest: ${service}
Questionnaire responses: ${questionnaire}

Write in clear, professional prose. No markdown headers. No bullet points. Just sharp strategic thinking.`;

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`Perplexity ${res.status}: ${detail}`);
      strategy = "<p>Strategy generation is temporarily unavailable. A Spazio strategist will prepare this section manually.</p>";
    } else {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "";
      // Convert plain text paragraphs to HTML
      strategy = raw
        .split(/\n\n+/)
        .filter((p: string) => p.trim())
        .map((p: string) => `<p style="margin: 0 0 16px;">${p.trim()}</p>`)
        .join("\n");
    }
  } catch (err) {
    console.error("Perplexity call failed", err);
    strategy = "<p>Strategy generation encountered an error. A Spazio strategist will complete this section.</p>";
  }

  // 3. Build the 3-page HTML brief
  const briefHTML = buildBriefHTML(company, service, strategy);

  // 4. Store HTML in Airtable and update status
  try {
    const res = await airtableFetch(`${REPORTS_TABLE}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        records: [
          {
            id: reportId,
            fields: {
              "Brief HTML": briefHTML,
              "Status": "Review Pending",
            },
          },
        ],
        typecast: true,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`Airtable update ${res.status}: ${detail}`);
      // Still return the brief even if save fails
    }
  } catch (err) {
    console.error("Airtable update failed", err);
  }

  return Response.json({ ok: true, briefHTML }, { status: 200 });
}
