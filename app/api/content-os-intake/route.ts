// POST /api/content-os-intake
// Accepts a Master Intake JSON, creates a Content OS Builds record (Status = New),
// fires /api/generate-content-os in the background (fire-and-forget), and returns
// { recordId } immediately. For the pilot, POST here directly (curl / internal).
import { createBuild, type ContentOSIntake } from "../../../lib/content-os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOf(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return `${host ? `${proto}://${host}` : ""}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Intake must be a JSON object." }, { status: 400 });
  }

  const intake = body as ContentOSIntake;

  let recordId: string;
  try {
    recordId = await createBuild(intake);
  } catch (err) {
    console.error("content-os-intake: create failed", (err as Error).message);
    return Response.json({ error: "Could not create build." }, { status: 502 });
  }

  // Fire generation in the background and return immediately — do NOT await.
  // NOTE: on Vercel a fetch kicked off here can be cut short once the response
  // is sent. If generation gets truncated in production, wrap this in
  // `after()` (next/server) or `waitUntil()` (@vercel/functions). Kept as plain
  // fire-and-forget per spec for now; the generate route is idempotent on recordId.
  const origin = originOf(request);
  if (origin) {
    fetch(`${origin}/api/generate-content-os`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId }),
    }).catch(() => {});
  }

  return Response.json({ recordId }, { status: 201 });
}
