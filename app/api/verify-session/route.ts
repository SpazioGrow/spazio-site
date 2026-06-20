// Server-side payment gate for the Foundation form (Square).
// GET /api/verify-session?order_id=...  ->  { paid, email, tier }
// Retrieves the Square order and only reports paid once it has completed,
// so an order id in the URL can't be forged to bypass payment.
import { SquareClient, SquareEnvironment } from "square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // Comp / bypass: a valid access code is a server-verified free pass — no Square needed.
  // This is the real gate for the comp path; the code lives only in env (AUDIT_COMP_CODE),
  // so it can't be forged from the client.
  const access = params.get("access") || "";
  const compCode = process.env.AUDIT_COMP_CODE || "";
  if (compCode && access === compCode) {
    return Response.json({ paid: true, comped: true, email: null, tier: "comp" });
  }

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return Response.json({ paid: false, error: "Payments not configured." }, { status: 500 });

  const orderId = params.get("order_id") || params.get("orderId");
  if (!orderId) return Response.json({ paid: false, error: "Missing order_id." }, { status: 400 });

  const environment = process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
  const client = new SquareClient({ token, environment });

  try {
    const resp = await client.orders.get({ orderId });
    const order = resp.order;
    const paid = !!order && (order.state === "COMPLETED" || (Array.isArray(order.tenders) && order.tenders.length > 0));
    const tier = order && order.metadata ? (order.metadata.tier ?? null) : null;
    return Response.json({ paid, email: null, tier });
  } catch (err) {
    console.error("verify order error:", (err as Error).message);
    return Response.json({ paid: false, error: "Could not verify order." }, { status: 400 });
  }
}
