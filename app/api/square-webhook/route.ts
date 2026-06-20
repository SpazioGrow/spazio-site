// Square webhook — verifies the signature (SQUARE_WEBHOOK_SIGNATURE_KEY) and,
// on payment.created / payment.updated with a COMPLETED payment, marks the
// matching Lead as paid in Airtable. Reads the raw body for verification and
// writes using Airtable FIELD IDS (several Leads field names have trailing spaces).
import { WebhooksHelper } from "square";

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

// The Email field is literally named "Email " (trailing space) — match it exactly.
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
  const sigKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const token = process.env.AIRTABLE_TOKEN;
  if (!sigKey) return Response.json({ error: "Webhook not configured." }, { status: 500 });

  const raw = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") || "";
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  // Must exactly match the notification URL registered in the Square dashboard.
  const notificationUrl = `${proto}://${host}/api/square-webhook`;

  let valid = false;
  try {
    valid = await WebhooksHelper.verifySignature({
      requestBody: raw,
      signatureHeader: signature,
      signatureKey: sigKey,
      notificationUrl,
    });
  } catch {
    valid = false;
  }
  if (!valid) {
    console.error("Square webhook signature verification failed");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    type?: string;
    data?: { object?: { payment?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Bad payload." }, { status: 400 });
  }

  if (event.type === "payment.created" || event.type === "payment.updated") {
    const payment = event.data?.object?.payment as Record<string, unknown> | undefined;
    const status = payment ? (payment.status as string) : "";
    if (payment && (status === "COMPLETED" || status === "APPROVED") && token) {
      const email = (payment.buyer_email_address as string) || "";
      const money = payment.amount_money as { amount?: number; currency?: string } | undefined;
      const amount = money && typeof money.amount === "number" ? (money.amount / 100).toFixed(2) : "";
      const cur = (money?.currency || "").toUpperCase();
      const paymentId = (payment.id as string) || "";
      const orderId = (payment.order_id as string) || "";
      const stamp = new Date().toISOString();
      const note = `Paid via Square${amount ? ` (${cur} ${amount})` : ""} · payment ${paymentId}${orderId ? ` · order ${orderId}` : ""} · ${stamp}`;
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      // Without a buyer email we can't match a Lead — log and acknowledge.
      if (!email) {
        console.warn("Square webhook: paid payment with no buyer email; cannot match lead.", paymentId);
        return Response.json({ received: true });
      }

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
          const name = email.split("@")[0];
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
        // Don't fail the webhook on an Airtable hiccup — log and 200 so Square doesn't retry forever.
        console.error("Airtable lead update failed:", (err as Error).message);
      }
    }
  }

  return Response.json({ received: true });
}
