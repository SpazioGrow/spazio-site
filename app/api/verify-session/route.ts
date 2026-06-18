// Server-side payment gate for the Foundation form.
// GET /api/verify-session?session_id=cs_...  ->  { paid, email, tier }
// The SPA calls this before rendering the intake form so a session_id in the
// URL can't be forged to bypass payment.
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ paid: false, error: "Payments not configured." }, { status: 500 });

  const id = new URL(request.url).searchParams.get("session_id");
  if (!id) return Response.json({ paid: false, error: "Missing session_id." }, { status: 400 });

  const stripe = new Stripe(key);
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const paid = s.payment_status === "paid" || s.payment_status === "no_payment_required";
    return Response.json({
      paid,
      email: s.customer_details?.email ?? null,
      tier: (s.metadata && s.metadata.tier) || null,
    });
  } catch (err) {
    console.error("verify-session error:", (err as Error).message);
    return Response.json({ paid: false, error: "Could not verify session." }, { status: 400 });
  }
}
