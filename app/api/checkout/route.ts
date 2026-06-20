// Square Checkout entry point for the paid Brand Gap Audit.
// GET /api/checkout?tier=brand-gap-audit creates a Square Payment Link
// (hosted checkout) from the configured catalog item and 303-redirects there.
// Env: SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, SQUARE_CATALOG_ITEM_ID.
import { SquareClient, SquareEnvironment } from "square";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOf(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return `${proto}://${host}`;
}

function squareEnv() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

export async function GET(request: Request) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const catalogObjectId = process.env.SQUARE_CATALOG_ITEM_ID; // item VARIATION id
  if (!token || !locationId || !catalogObjectId) {
return Response.redirect(new URL("/", request.url), 303);
  }

  const client = new SquareClient({ token, environment: squareEnv() });
  const url = new URL(request.url);
  const tier = url.searchParams.get("tier") || "brand-gap-audit";
  const origin = originOf(request);

  try {
    const resp = await client.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        referenceId: tier,
        lineItems: [{ catalogObjectId, quantity: "1" }],
        // tier carried as order metadata (the buyer's email is collected by
        // Square at checkout and arrives on the payment webhook).
        metadata: { tier },
      },
      // Square appends ?orderId=...&transactionId=... to this URL on success.
      checkoutOptions: { redirectUrl: `${origin}/` },
    });
    const link = resp.paymentLink?.url;
    if (!link) {
      console.error("square checkout: no payment link url", resp.errors);
      return Response.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return Response.redirect(link, 303);
  } catch (err) {
    console.error("square checkout error:", (err as Error).message);
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
