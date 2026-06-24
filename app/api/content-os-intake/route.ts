// POST /api/content-os-intake
// Accepts a Master Intake JSON, creates a Content OS Builds record (Status = New),
// fires /api/generate-content-os in the background (fire-and-forget), and returns
// { recordId } immediately. For the pilot, POST here directly (curl / internal).
import { after } from "next/server";
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

  // Trigger generation after the response is sent. `after()` keeps the function
  // alive long enough to dispatch the request; the generate route then acks fast
  // and runs the chain inside its own `after()` (so neither call blocks the user).
  // Generate is idempotent on recordId, so a re-fire is always safe.
  const origin = originOf(request);
  if (origin) {
    after(async () => {
      try {
        await fetch(`${origin}/api/generate-content-os`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId }),
        });
      } catch (err) {
        console.error("content-os-intake: background generate trigger failed", (err as Error).message);
      }
    });
  }

  return Response.json({ recordId }, { status: 201 });
}
