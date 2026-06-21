// Brand Gap Audit checkout — payment handled manually for now.
// A valid ?access=<AUDIT_COMP_CODE> is a private comp bypass into the gated
// Foundation form (re-verified server-side in /api/verify-session). Everything
// else just returns to the homepage — there is no public paid checkout here.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = new URL(request.url).searchParams.get("access") || "";
  const code = process.env.AUDIT_COMP_CODE || "";
  const h = request.headers;
  const origin = `${h.get("x-forwarded-proto") || "https"}://${h.get("x-forwarded-host") || h.get("host") || ""}`;

  if (code && access === code) {
    return Response.redirect(`${origin}/?access=${encodeURIComponent(access)}#foundation`, 303);
  }
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
