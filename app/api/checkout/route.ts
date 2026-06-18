// Stripe Checkout entry point for the paid Brand Gap Audit.
// GET /api/checkout?tier=brand-gap-audit[&email=...] creates a Checkout
// Session and 303-redirects the browser to Stripe's hosted page.
// Secrets come from env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID.
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOf(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!key || !price) {
    return Response.json({ error: "Payments are not configured yet." }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const url = new URL(request.url);
  const tier = url.searchParams.get("tier") || "brand-gap-audit";
  const email = url.searchParams.get("email") || undefined;
  const origin = originOf(request);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      // Customer email + tier carried as metadata for the webhook/Airtable.
      metadata: { tier, ...(email ? { email } : {}) },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}#foundation`,
      cancel_url: `${origin}/#audit`,
    });
    if (!session.url) {
      return Response.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return Response.redirect(session.url, 303);
  } catch (err) {
    console.error("checkout error:", (err as Error).message);
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
