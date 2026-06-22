// Foundation endpoint — creates Lead + Report, fires the heavy pipeline,
// and drops an internal Asana task so the answers can be reviewed.
// The Asana task is created automatically on every submission (i.e. every time
// a submission hits Airtable), in "Design Reviews (Internal)".
import { waitUntil } from "@vercel/functions";
import {
  BUDGET_OPTIONS, TIMELINE_OPTIONS, SERVICE_OPTIONS, SOURCE_OPTIONS,
} from "@/lib/foundation-options";

export const maxDuration = 60; // Vercel Pro — covers the pipeline trigger

const BASE_ID = "appv2sIRwDvNPjV7j";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const ASANA_REVIEW_PROJECT = "1215677774689770"; // "Design Reviews (Internal)"

const LEAD_FIELDS = {
  name: "fldcNCcvpv3UYK7sR", email: "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh", website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev", source: "fldD97lODtKXRBp57",
  budget: "fldrhPTMDbn0IGJch",   // "Budget Range " (trailing space)
  timeline: "fldofaQa10V0594uS", // "Select" (timeline)
  notes: "fld3V6uS3RfOxS8ZV",    // "Notes"
} as const;

const REPORT_FIELDS = {
  reportId: "fldDIew0Hh6uWyy7Z", lead: "flduD1QjX8XxucINU",
  answers: "fldgTPk5L6fnvZzZo", status: "fldLUKmsHhqidDFWb",
} as const;

function str(v: unknown): string { return typeof v === "string" ? v.trim() : ""; }
function inSet(v: string, allowed: readonly string[]): boolean { return allowed.includes(v); }

// Auto-creates the internal review task. Runs in waitUntil so it never blocks the
// response. This is the "task appears in Asana every time a form hits Airtable" piece.
async function createReviewTask(opts: {
  name: string; company: string; email: string; service: string; website: string;
  answers: Record<string, unknown>; leadId: string; reportId: string; ref: string;
}) {
  const asanaToken = process.env.ASANA_TOKEN;
  if (!asanaToken) { console.error("ASANA_TOKEN missing — skipping review task"); return; }

  const lines = Object.entries(opts.answers)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `\u2022 ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");

  const notes =
    `New Foundation submission \u2014 review the answers, then move this to the client's Reviews project.\n\n` +
    `Client: ${opts.name}\n` +
    (opts.company ? `Company: ${opts.company}\n` : "") +
    `Email: ${opts.email}\n` +
    (opts.service ? `Service interest: ${opts.service}\n` : "") +
    (opts.website ? `Website: ${opts.website}\n` : "") +
    `\nFull answers:\n${lines}\n\n` +
    `Airtable \u2014 Lead: ${opts.leadId} | Report: ${opts.ref} (${opts.reportId})`;

  const taskName = `New submission \u2014 ${opts.name}${opts.company ? ` (${opts.company})` : ""}`;

  try {
    const res = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${asanaToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { name: taskName, notes, projects: [ASANA_REVIEW_PROJECT] } }),
    });
    if (!res.ok) console.error("Asana review task failed:", res.status, await res.text());
  } catch (e) { console.error("Asana review task error:", e); }
}

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return Response.json({ error: "Server not configured." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const name = str(body.name), email = str(body.email), company = str(body.company), service = str(body.service);
  if (!name || !email) return Response.json({ error: "Name and email are required." }, { status: 400 });

  // Comped (free test-run) audits are tagged distinctly so they're filterable from paid.
  const comped = body.comped === true;
  const source = comped ? "Comp / Test" : "Foundation Form";

  const questionnaire = (body.questionnaire ?? {}) as Record<string, unknown>;
  const budget = str(questionnaire.budget), timeline = str(questionnaire.timeline);

  const atHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Non-select base fields — these can't 422 on a missing option.
  const base: Record<string, string> = { [LEAD_FIELDS.name]: name, [LEAD_FIELDS.email]: email };
  if (company) base[LEAD_FIELDS.company] = company;
  if (str(body.website)) base[LEAD_FIELDS.website] = str(body.website);

  // Validate every select against the shared vocab. In-vocab → write the field;
  // off-vocab (or blank) → never written; the raw value is parked in Notes.
  const selects: Record<string, string> = {};
  const overflow: string[] = [];
  const guard = (id: string, value: string, allowed: readonly string[], label: string) => {
    if (!value) return;
    if (inSet(value, allowed)) selects[id] = value;
    else overflow.push(`${label}: ${value}`);
  };
  guard(LEAD_FIELDS.source, source, SOURCE_OPTIONS, "Source");
  guard(LEAD_FIELDS.service, service, SERVICE_OPTIONS, "Service Interest");
  guard(LEAD_FIELDS.budget, budget, BUDGET_OPTIONS, "Budget");
  guard(LEAD_FIELDS.timeline, timeline, TIMELINE_OPTIONS, "Timeline");

  const createLead = async (fields: Record<string, string>): Promise<{ id?: string; err?: string }> => {
    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}`, {
        method: "POST", headers: atHeaders,
        body: JSON.stringify({ records: [{ fields }], typecast: false }),
      });
      if (res.ok) return { id: (await res.json()).records[0].id };
      return { err: await res.text() };
    } catch (e) { return { err: (e as Error).message }; }
  };

  // Attempt 1: base + validated selects (+ any off-vocab overflow in Notes).
  const fields1: Record<string, string> = { ...base, ...selects };
  if (overflow.length) fields1[LEAD_FIELDS.notes] = overflow.join("\n");

  let leadId = "";
  const r1 = await createLead(fields1);
  if (r1.id) {
    leadId = r1.id;
  } else {
    // An in-vocab value isn't a defined option yet. Don't block capture — retry
    // with ALL selects folded into Notes (base fields only can't fail on options).
    console.error("Lead create attempt failed; retrying with selects in Notes:", r1.err);
    const notes2 = [...overflow];
    if (selects[LEAD_FIELDS.source]) notes2.push(`Source: ${selects[LEAD_FIELDS.source]}`);
    if (selects[LEAD_FIELDS.service]) notes2.push(`Service Interest: ${selects[LEAD_FIELDS.service]}`);
    if (selects[LEAD_FIELDS.budget]) notes2.push(`Budget: ${selects[LEAD_FIELDS.budget]}`);
    if (selects[LEAD_FIELDS.timeline]) notes2.push(`Timeline: ${selects[LEAD_FIELDS.timeline]}`);
    const fields2: Record<string, string> = { ...base };
    if (notes2.length) fields2[LEAD_FIELDS.notes] = notes2.join("\n");
    const r2 = await createLead(fields2);
    if (r2.id) leadId = r2.id;
    else { console.error("Lead create retry failed:", r2.err); return Response.json({ error: "Could not save lead." }, { status: 502 }); }
  }

  // Create Report.
  const allAnswers = { company, service, email, comped, budget, timeline, ...questionnaire as object };
  const ref = (company || name).replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();

  let reportId: string;
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}`, {
      method: "POST", headers: atHeaders,
      body: JSON.stringify({ records: [{ fields: {
        [REPORT_FIELDS.reportId]: ref, [REPORT_FIELDS.lead]: [leadId],
        [REPORT_FIELDS.answers]: JSON.stringify(allAnswers), [REPORT_FIELDS.status]: "Generating",
      }}], typecast: true }),
    });
    if (!res.ok) { console.error("Report failed:", await res.text()); return Response.json({ error: "Could not create report." }, { status: 502 }); }
    reportId = (await res.json()).records[0].id;
  } catch { return Response.json({ error: "Could not reach database." }, { status: 502 }); }

  // Fire the heavy pipeline (Perplexity/visuals/deck).
  const origin = new URL(request.url).origin;
  waitUntil(
    fetch(`${origin}/api/generate-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, leadId }),
    })
      .then(async (r) => { if (!r.ok) console.error("generate-deck trigger failed:", r.status, await r.text()); })
      .catch((e) => console.error("generate-deck trigger error:", e))
  );

  // Auto-create the internal Asana review task with the client's answers.
  waitUntil(createReviewTask({
    name, company, email, service, website: str(body.website),
    answers: allAnswers as Record<string, unknown>, leadId, reportId, ref,
  }));

  return Response.json({ ok: true, leadId, reportId }, { status: 201 });
}
