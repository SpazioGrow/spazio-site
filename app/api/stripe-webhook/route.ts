// Stripe webhook — verifies the signature (STRIPE_WEBHOOK_SECRET) and, on
// checkout.session.completed, marks the matching Lead as paid in Airtable.
// Reads the raw request body (required for signature verification) and writes
// using Airtable FIELD IDS (several Leads field names have trailing spaces).
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";

// Field IDs (names have trailing spaces in Airtable — never use the names for writes).
const F = {
  name: "fldcNCcvpv3UYK7sR",
  email: "fld8bcTQhFU2ZBxKS",
  source: "fldD97lODtKXRBp57",
  status: "fldIWtvaSJeRKV6J1",
  notes: "fld3V6uS3RfOxS8ZV",
} as const;

// The Email field is literally named "Email " (trailing space) — match it exactly in the formula.
const EMAIL_FIELD_NAME = "Email ";

type LeadRecord = { id: string; fields: Record<string, unknown> };

async function findLead(token: string, email: string): Promise<LeadRecord | null> {
  const formula = `{${EMAIL_FIELD_NAME}}="${email.replace(/"/g, '\\"')}"`;
  const url =
    `https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}` +
    `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1&returnFieldsByFieldId=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.records && data.records[0] ? (data.records[0] as LeadRecord) : null;
}

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const token = process.env.AIRTABLE_TOKEN;
  if (!key || !whSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const sig = request.headers.get("stripe-signature") || "";
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const email =
      s.customer_details?.email || s.customer_email || (s.metadata && s.metadata.email) || "";

    if (email && token) {
      const amount = typeof s.amount_total === "number" ? (s.amount_total / 100).toFixed(2) : "";
      const cur = (s.currency || "").toUpperCase();
      const tier = (s.metadata && s.metadata.tier) || "brand-gap-audit";
      const stamp = new Date().toISOString();
      const note = `Paid via Stripe — ${tier}${amount ? ` (${cur} ${amount})` : ""} · session ${s.id} · ${stamp}`;
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      try {
        const existing = await findLead(token, email);
        if (existing) {
          const prior = typeof existing.fields[F.notes] === "string" ? (existing.fields[F.notes] as string) : "";
          const notes = prior ? `${note}\n${prior}` : note;
          await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}/${existing.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ fields: { [F.status]: "Paid", [F.notes]: notes }, typecast: true }),
          });
        } else {
          const name = s.customer_details?.name || email.split("@")[0];
          await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              records: [{ fields: { [F.name]: name, [F.email]: email, [F.source]: "Website Form", [F.status]: "Paid", [F.notes]: note } }],
              typecast: true,
            }),
          });
        }
      } catch (err) {
        // Don't fail the webhook on an Airtable hiccup — log and return 200 so Stripe doesn't hammer retries.
        console.error("Airtable lead update failed:", (err as Error).message);
      }
    }
  }

  return Response.json({ received: true });
}
