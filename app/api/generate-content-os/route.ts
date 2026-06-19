// POST /api/generate-content-os  { recordId }
// Background A–I chain for one Content OS build. Idempotent on recordId.
// Prompts/gates verbatim per spec: Category Scan from the pipeline spec; Foundation,
// Pillars, Voice, Cadence from content-os-prompts-and-gates.md. Operating Manual is
// CODE-assembled (invents nothing). A gate fail auto-regenerates once, then flags for
// manual (Prompt Package is the fallback, written early so a truncated run is recoverable).
import { after } from "next/server";
import { getBuild, updateBuild, type BuildPatch } from "../../../lib/content-os";
import {
  CONTENT_OS_BASE_ID,
  CONTENT_OS_TABLE_ID,
  COS_FIELD_NAMES,
  COS_STATUS,
  COS_FORMAT_STATUS,
} from "../../../lib/content-os-fields";
import { runPerplexity, runOpenAIJSON } from "../../../lib/content-os-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Full chain = 1 Perplexity + up to 4 OpenAI calls (×2 with one regenerate each) + assembly + Asana.
export const maxDuration = 300;

const JSON_SYS = "Return only valid JSON — no preamble, no markdown, no code fences.";

/* ---------------- small utils ---------------- */
function s(v: unknown): string { return typeof v === "string" ? v : v == null ? "" : String(v); }
function val(v: unknown): string { const t = s(v).trim(); return t || "(not provided)"; }
function esc(x: string): string { return (x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function wordCount(x: string): number { return (x || "").trim().split(/\s+/).filter(Boolean).length; }
function deApos(x: string): string { return (x || "").replace(/[‘’]/g, "'"); }
function normWords(x: string): string[] { return (x || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/* ---------------- prompts (verbatim bases + appended inputs) ---------------- */
function catScanPrompt(subNiche: string, competitiveSet: string, audience: string): string {
  return `Research the content landscape for this creator's niche. Use the sub-niche, the named
competitive set, and the target audience below.

Report, concisely:
- What the named competitors actually post about — the territories they already own.
- Where the field clusters (the crowded, repeated angles everyone runs).
- 2–3 specific OPEN territories the competitive set is NOT serving for this audience.
- Any audience tensions or unmet needs the field ignores.

Be concrete and cite what each competitor is known for. Do not invent competitors not listed.
Return prose (no markdown headers needed); this is research feeding an internal strategy step.

Sub-niche: ${val(subNiche)}
Named competitive set: ${val(competitiveSet)}
Target audience: ${val(audience)}`;
}

function foundationPrompt(business: string, differentiation: string, audience: string, subNiche: string, competitiveSet: string, scan: string): string {
  return `You are Spazio's brand strategist. From the intake and category scan below, derive the
positioning spine for this creator.

Return a one-paragraph foundation and a differentiation statement. The differentiation MUST
complete this exact sentence with specifics: "The only [sub-niche] creator who [specific
capability or point of view] for [specific person]."

Rules:
- Specific enough to reject a content idea against. If a generic fitness post would pass, it's too vague.
- It must NOT describe more than one creator in the competitive set. Use the category scan to
  avoid claiming territory a competitor already owns.
- No filler virtues (authentic, relatable, passionate, real). Name the actual edge.

Return JSON only:
{ "foundation": "...", "differentiation": "...", "only_sentence": "The only ... who ... for ..." }

--- INTAKE ---
Business / what they do: ${val(business)}
Their stated differentiation: ${val(differentiation)}
Audience: ${val(audience)}
Sub-niche: ${val(subNiche)}
Competitive set: ${val(competitiveSet)}

--- CATEGORY SCAN ---
${val(scan)}`;
}

function pillarsPrompt(foundation: string, differentiation: string, scan: string, competitiveSet: string): string {
  return `Using the locked foundation below, produce 4–6 CANDIDATE content pillars for Christine to cut to 3–5.

Each pillar must:
- Ladder to the foundation (state how).
- Be distinct from the others — no two pillars that are the same idea worded differently.
- Note who owns this territory in the competitive set, or mark it "open."
- Be sustainable — give 3 example post ideas proving the creator can produce against it forever.

At least one pillar must sit in open territory the competitive set does not own.
Do NOT include a "trending topics" pillar — that's not a territory.

Return JSON only:
{ "pillars": [ { "name":"", "rationale":"", "ladder":"", "ownership":"open|<competitor>", "supply":["","",""] } ] }

--- LOCKED FOUNDATION ---
${val(foundation)}

--- DIFFERENTIATION ---
${val(differentiation)}

--- CATEGORY SCAN ---
${val(scan)}

--- COMPETITIVE SET ---
${val(competitiveSet)}`;
}

function voicePrompt(voiceRefs: string, dmSample: string, personalityCues: string, foundation: string): string {
  return `Derive this creator's voice. Anchor everything to the REAL sample below — it is how they
actually talk. Your output must sound like them on their most-themselves day, never smoother
or more corporate than the sample.

Produce:
- 3–5 voice attributes that are SPECIFIC to this person. FORBIDDEN (auto-rejected): authentic,
  relatable, empowering, journey, real, raw, genuine, passionate. For each attribute say why it's
  theirs and not anyone's.
- Do/don't pairs.
- 3–4 example rewrites: take a generic caption and rewrite it INTO this voice, reusing the
  contractions, sentence length, and vocabulary present in the real sample.

Return JSON only:
{ "attributes":[{"name":"","why_specific":""}], "do_dont":[{"do":"","dont":""}],
  "examples":[{"generic":"","in_voice":""}] }

--- VOICE REFERENCES (+ why each) ---
${val(voiceRefs)}

--- REAL DM / CAPTION SAMPLE ---
${val(dmSample)}

--- PERSONALITY CUES ---
${val(personalityCues)}

--- FOUNDATION ---
${val(foundation)}`;
}

function cadencePrompt(pillarsText: string, capacity: string, publisher: string, tools: string, goals: string): string {
  return `Build a cadence this creator will actually sustain. The capacity number below is a ceiling, not
a target.

Produce:
- Pillar mix as percentages, weighted toward the stated goal (e.g., more conversion formats if
  the goal is sales).
- A weekly rhythm: posts per week must NOT exceed stated capacity. When unsure, go lighter.
- An EMPTY calendar scaffold: slots labeled by pillar + format only. Never write actual post content.
- A workflow (idea -> draft -> publish) naming who owns each step. Christine is never the publisher.

Return JSON only:
{ "mix":{"<pillar>":<pct>}, "weekly_rhythm":[{"day":"","pillar":"","format":""}],
  "calendar_scaffold":[{"slot":"","pillar":"","format":""}], "workflow":[{"step":"","owner":""}] }

--- LOCKED PILLARS ---
${val(pillarsText)}

--- POSTING REALITY ---
Capacity (posts/week ceiling): ${val(capacity)}
Who publishes: ${val(publisher)}
Tools: ${val(tools)}

--- GOALS ---
${val(goals)}`;
}

// Kept ONLY for the paste-ready fallback — the live Manual is code-assembled.
const MANUAL_FALLBACK_PROMPT = `Assemble the run-it-yourself Operating Manual in Spazio's voice. Use ONLY the locked inputs
below. Introduce no new pillar, no new strategy, no new decision — if something isn't in the
inputs, it doesn't go in the manual.

Sections: How to use this · Your pillars · Your voice · Your templates (state the format status)
· Your cadence · Your workflow.

Written so the creator runs it without Christine in the room. Return clean HTML only.`;

/* ---------------- gates (verbatim rubric) ---------------- */
const BANNED_DIFF = /\b(authentic|relatable|passionate|real)\b/i;
const FORBIDDEN_VOICE = ["authentic", "relatable", "empowering", "journey", "real", "raw", "genuine", "passionate"];

function foundationGate(o: any): string | null {
  if (!o || typeof o !== "object") return "no object returned";
  const only = s(o.only_sentence), diff = s(o.differentiation), fnd = s(o.foundation);
  if (!only.trim()) return "only_sentence empty";
  if (!/\bfor\b/i.test(only)) return "only_sentence missing 'for <person>'";
  if (/\b(everyone|people|anyone)\b/i.test(only)) return "audience too generic";
  if (BANNED_DIFF.test(diff)) return "differentiation uses a banned generic virtue";
  if (wordCount(fnd) < 40) return `foundation under 40 words (${wordCount(fnd)})`;
  return null;
}

function pillarsGate(o: any): string | null {
  const ps = o?.pillars;
  if (!Array.isArray(ps)) return "no pillars array";
  if (ps.length < 4 || ps.length > 6) return `pillar count ${ps.length} not in 4–6`;
  if (ps.some((p: any) => !s(p?.ladder).trim())) return "a pillar is missing its ladder";
  if (!ps.some((p: any) => s(p?.ownership).toLowerCase() === "open")) return "no open-territory pillar";
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      if (jaccard(normWords(s(ps[i]?.name)), normWords(s(ps[j]?.name))) > 0.6) {
        return `pillars ${i + 1} and ${j + 1} look like near-duplicates (merge)`;
      }
    }
  }
  return null;
}

function voiceGate(o: any, sample: string): string | null {
  const attrs = o?.attributes;
  if (!Array.isArray(attrs) || attrs.length < 3) return "fewer than 3 attributes";
  for (const a of attrs) {
    const n = s(a?.name).toLowerCase();
    if (FORBIDDEN_VOICE.some((f) => new RegExp(`\\b${f}\\b`).test(n))) return `forbidden attribute "${s(a?.name)}"`;
  }
  const ex = o?.examples;
  if (!Array.isArray(ex) || ex.length < 3) return "fewer than 3 example rewrites";
  // heuristic: if the real sample uses contractions, the in_voice rewrites should too (else reads more formal)
  if (/\b\w+'\w+\b/.test(deApos(sample))) {
    const anyContraction = ex.some((e: any) => /\b\w+'\w+\b/.test(deApos(s(e?.in_voice))));
    if (!anyContraction) return "in_voice rewrites dropped the sample's contractions (reads more formal)";
  }
  return null;
}

function cadenceGate(o: any, capacity: string): string | null {
  const mix = o?.mix;
  if (!mix || typeof mix !== "object") return "no mix";
  const sum = Object.values(mix).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  if (sum < 95 || sum > 105) return `mix sums to ${sum}, not ~100`;
  const rhythm = o?.weekly_rhythm;
  if (!Array.isArray(rhythm)) return "no weekly_rhythm";
  const cap = Number(String(capacity).match(/\d+/)?.[0]);
  if (Number.isFinite(cap) && cap > 0 && rhythm.length > cap) return `weekly posts ${rhythm.length} exceed capacity ${cap}`;
  const scaffold = o?.calendar_scaffold;
  if (Array.isArray(scaffold)) {
    for (const slot of scaffold) {
      for (const v of Object.values(slot || {})) {
        if (typeof v === "string" && v.length > 80) return "calendar_scaffold contains caption-like text";
      }
    }
  }
  const wf = o?.workflow;
  if (Array.isArray(wf)) {
    for (const w of wf) {
      if (s(w?.step).toLowerCase().includes("publish") && s(w?.owner).toLowerCase().includes("christine")) {
        return "Christine assigned as publisher";
      }
    }
  }
  return null;
}

/* ---------------- draft-with-gate (regenerate once, then flag) ---------------- */
async function draftWithGate<T>(label: string, gen: () => Promise<T>, gate: (v: T) => string | null, flags: string[]): Promise<T | null> {
  let last: T | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const v = await gen();
      last = v;
      const fail = gate(v);
      if (!fail) return v;
      if (attempt === 2) { flags.push(`${label}: gate failed after regenerate (${fail}) — flagged for manual`); return v; }
    } catch (e) {
      if (attempt === 2) { flags.push(`${label}: generation error (${(e as Error).message}) — flagged for manual`); return last; }
    }
  }
  return last;
}

async function safeUpdate(recordId: string, patch: BuildPatch, flags: string[]): Promise<void> {
  try { await updateBuild(recordId, patch); }
  catch (e) { flags.push(`airtable update: ${(e as Error).message}`); }
}

/* ---------------- Prompt Package (paste-ready fallback) ---------------- */
function buildPromptPackage(inp: Record<string, string>, scan: string): string {
  const intakeSummary =
    `Creator: ${val(inp.creatorName)}\nSub-niche: ${val(inp.subNiche)}\nAudience: ${val(inp.audience)}\n` +
    `Competitive set: ${val(inp.competitiveSet)}\nBusiness: ${val(inp.business)}\nStated differentiation: ${val(inp.diffInput)}\n` +
    `Voice references: ${val(inp.voiceRefs)}\nReal DM/caption sample: ${val(inp.dmSample)}\nPersonality cues: ${val(inp.personalityCues)}\n` +
    `Capacity: ${val(inp.capacity)}\nWho publishes: ${val(inp.publisher)}\nTools: ${val(inp.tools)}\nGoals: ${val(inp.goals)}`;
  return [
    "CONTENT OS — MANUAL BUILD PACKAGE",
    "If the automated draft is incomplete, paste each step below into your model of choice, in order. Each returns JSON (except the Manual, which returns HTML).",
    `\n=== INTAKE ===\n${intakeSummary}`,
    `\n=== CATEGORY SCAN (already run) ===\n${scan || "(category scan unavailable — run STEP A first)"}`,
    `\n=== STEP A · CATEGORY SCAN ===\n${catScanPrompt(inp.subNiche, inp.competitiveSet, inp.audience)}`,
    `\n=== STEP B · FOUNDATION ===\n${foundationPrompt(inp.business, inp.diffInput, inp.audience, inp.subNiche, inp.competitiveSet, scan)}`,
    `\n=== STEP C · PILLARS (run after Foundation; paste the foundation + differentiation in) ===\n${pillarsPrompt("<foundation>", "<differentiation>", scan, inp.competitiveSet)}`,
    `\n=== STEP D · VOICE ===\n${voicePrompt(inp.voiceRefs, inp.dmSample, inp.personalityCues, "<foundation>")}`,
    `\n=== STEP E · CADENCE (run after Pillars; paste the locked pillars in) ===\n${cadencePrompt("<locked pillars>", inp.capacity, inp.publisher, inp.tools, inp.goals)}`,
    `\n=== STEP F · OPERATING MANUAL (assembly) ===\n${MANUAL_FALLBACK_PROMPT}`,
  ].join("\n");
}

/* ---------------- Operating Manual (code-assembled; invents nothing) ---------------- */
function buildManualHTML(d: any): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const pillars: any[] = Array.isArray(d.pillars) ? d.pillars : [];
  const voice: any = d.voice || null;
  const cadence: any = d.cadence || null;

  const section = (title: string, inner: string) =>
    `<div style="padding:30px 40px;border-top:2px solid #DFD9C9;"><h2 style="margin:0 0 14px;font-size:24px;font-weight:600;letter-spacing:-.02em;color:#17160F;">${title}</h2>${inner}</div>`;

  const pillarsHTML = pillars.length
    ? pillars.map((p, i) => {
        const supply = Array.isArray(p?.supply) && p.supply.length
          ? `<ul style="margin:6px 0 0 18px;padding:0;">${p.supply.map((x: any) => `<li style="font-size:14px;color:#514E44;margin:0 0 4px;">${esc(s(x))}</li>`).join("")}</ul>` : "";
        return `<div style="margin:0 0 18px;"><p style="margin:0;font-weight:600;font-size:16px;color:#17160F;">${i + 1}. ${esc(s(p?.name))}</p>${p?.rationale ? `<p style="margin:4px 0 0;font-size:14.5px;color:#514E44;line-height:1.6;">${esc(s(p.rationale))}</p>` : ""}${supply}</div>`;
      }).join("")
    : `<p style="font-size:14.5px;color:#847F71;">Your pillars are being finalized.</p>`;

  let voiceHTML = `<p style="font-size:14.5px;color:#847F71;">Your voice guide is being finalized.</p>`;
  if (voice) {
    const attrs = Array.isArray(voice.attributes) ? voice.attributes.map((a: any) => `<li style="font-size:14.5px;color:#514E44;margin:0 0 6px;"><strong>${esc(s(a?.name))}</strong>${a?.why_specific ? ` — ${esc(s(a.why_specific))}` : ""}</li>`).join("") : "";
    const dd = Array.isArray(voice.do_dont) ? voice.do_dont.map((x: any) => `<tr><td style="padding:6px 12px;border-top:1px solid #DFD9C9;font-size:14px;color:#2C5F2D;">${esc(s(x?.do))}</td><td style="padding:6px 12px;border-top:1px solid #DFD9C9;font-size:14px;color:#847F71;">${esc(s(x?.dont))}</td></tr>`).join("") : "";
    const ex = Array.isArray(voice.examples) ? voice.examples.map((e: any) => `<div style="margin:0 0 10px;"><p style="margin:0;font-size:13px;color:#847F71;">Generic: ${esc(s(e?.generic))}</p><p style="margin:2px 0 0;font-size:14.5px;color:#17160F;">In your voice: ${esc(s(e?.in_voice))}</p></div>`).join("") : "";
    voiceHTML = `${attrs ? `<ul style="margin:0 0 14px 18px;padding:0;">${attrs}</ul>` : ""}${dd ? `<table style="border-collapse:collapse;width:100%;margin:0 0 14px;"><thead><tr><th style="text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#847F71;padding:0 12px 6px;">Do</th><th style="text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#847F71;padding:0 12px 6px;">Don't</th></tr></thead><tbody>${dd}</tbody></table>` : ""}${ex}` || voiceHTML;
  }

  let cadenceHTML = `<p style="font-size:14.5px;color:#847F71;">Your cadence is being finalized.</p>`;
  let workflowHTML = `<p style="font-size:14.5px;color:#847F71;">Your workflow is being finalized.</p>`;
  if (cadence) {
    const mix = cadence.mix && typeof cadence.mix === "object"
      ? Object.entries(cadence.mix).map(([k, v]) => `<li style="font-size:14px;color:#514E44;margin:0 0 4px;">${esc(s(k))} — ${esc(s(v))}%</li>`).join("") : "";
    const rhythm = Array.isArray(cadence.weekly_rhythm)
      ? cadence.weekly_rhythm.map((r: any) => `<tr><td style="padding:6px 12px;border-top:1px solid #DFD9C9;font-size:14px;">${esc(s(r?.day))}</td><td style="padding:6px 12px;border-top:1px solid #DFD9C9;font-size:14px;">${esc(s(r?.pillar))}</td><td style="padding:6px 12px;border-top:1px solid #DFD9C9;font-size:14px;">${esc(s(r?.format))}</td></tr>`).join("") : "";
    cadenceHTML = `${mix ? `<p style="margin:0 0 6px;font-weight:600;font-size:14px;color:#17160F;">Pillar mix</p><ul style="margin:0 0 14px 18px;padding:0;">${mix}</ul>` : ""}${rhythm ? `<p style="margin:0 0 6px;font-weight:600;font-size:14px;color:#17160F;">Weekly rhythm</p><table style="border-collapse:collapse;width:100%;"><tbody>${rhythm}</tbody></table>` : ""}` || cadenceHTML;
    if (Array.isArray(cadence.workflow) && cadence.workflow.length) {
      workflowHTML = `<ol style="margin:0 0 0 18px;padding:0;">${cadence.workflow.map((w: any) => `<li style="font-size:14.5px;color:#514E44;margin:0 0 6px;"><strong>${esc(s(w?.step))}</strong> — ${esc(s(w?.owner))}</li>`).join("")}</ol>`;
    }
  }

  const positioning = d.foundationText
    ? section("Your positioning", `<p style="font-size:15px;color:#514E44;line-height:1.7;margin:0 0 10px;">${esc(s(d.foundationText))}</p>${d.differentiation ? `<p style="font-size:15px;color:#17160F;font-weight:600;margin:0;">${esc(s(d.differentiation))}</p>` : ""}`)
    : "";

  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:#17160F;max-width:900px;margin:0 auto;">
  <div style="padding:64px 40px;background:#17160F;color:#FAF8F2;">
    <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#847F71;margin:0 0 20px;">Spazio · Content OS</p>
    <h1 style="font-size:40px;font-weight:600;line-height:1;letter-spacing:-.03em;margin:0;">${esc(s(d.creatorName)) || "Your"} Operating Manual</h1>
    <p style="font-size:13px;color:#847F71;margin:16px 0 0;">${date}</p>
  </div>
  ${section("How to use this", `<p style="font-size:15px;color:#514E44;line-height:1.7;margin:0;">This is your system to run on your own. Your pillars say what to make, your voice says how it should sound, your cadence sets the pace, and your workflow says who does what. Keep the voice notes beside you while you write, and let the cadence flex with real life.</p>`)}
  ${positioning}
  ${section("Your pillars", pillarsHTML)}
  ${section("Your voice", voiceHTML)}
  ${section("Your templates", `<p style="font-size:15px;color:#514E44;line-height:1.7;margin:0;">Brand template kit — pending brand-swap. Your reusable post templates are being prepared in your brand colors, type, and logo so every post looks unmistakably yours. You'll get the editable kit once the brand-swap is complete.</p>`)}
  ${section("Your cadence", cadenceHTML)}
  ${section("Your workflow", workflowHTML)}
  <div style="padding:24px 40px;background:#17160F;color:#847F71;font-size:12px;">Spazio · made to run without us in the room.</div>
</div>`.trim();
}

/* ---------------- Asana review task ---------------- */
async function createAsanaTask(recordId: string, info: { creatorName: string; handle: string; email: string; pillarsCount: number; flags: string[] }): Promise<void> {
  const token = process.env.ASANA_TOKEN;
  const project = process.env.ASANA_CONTENT_OS_PROJECT_GID;
  if (!token || !project) return; // not configured — record is still complete and re-runnable
  const recordUrl = `https://airtable.com/${CONTENT_OS_BASE_ID}/${CONTENT_OS_TABLE_ID}/${recordId}`;
  const flagLine = info.flags.length ? `\n\n<strong>Auto-flags (needs a look):</strong> ${esc(info.flags.join("; "))}` : "";
  try {
    const r = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: {
        name: `Review Content OS: ${info.creatorName || info.handle || "new creator"}`,
        html_notes: `<body><strong>Content OS drafts ready for review.</strong>\n\n<strong>Creator:</strong> ${esc(info.creatorName)}\n<strong>Handle:</strong> ${esc(info.handle)}\n<strong>Email:</strong> ${esc(info.email)}\n<strong>Pillars drafted:</strong> ${info.pillarsCount} candidates (cut to 3–5)\n<strong>Format:</strong> Brand template kit — pending brand-swap\n\nCurate the build in Airtable: ${recordUrl}${flagLine}</body>`,
        projects: [project],
        due_on: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      } }),
    });
    if (!r.ok) {
      if (r.status === 404) {
        console.error(`Asana 404 on project ${project} — the production ASANA_TOKEN is likely a different workspace than expected.`);
      } else {
        console.error(`Asana task create failed ${r.status}: ${await r.text().catch(() => "")}`);
      }
      info.flags.push(`asana: ${r.status}`);
      return;
    }
    const gid = (await r.json())?.data?.gid;
    if (gid) await updateBuild(recordId, { asanaTaskGid: String(gid) });
  } catch (e) {
    info.flags.push(`asana: ${(e as Error).message}`);
  }
}

/* ---------------- the chain ---------------- */
async function runGenerate(recordId: string): Promise<void> {
  const build = await getBuild(recordId);
  if (!build) { console.error("generate-content-os: record not found", recordId); return; }
  const intake: any = build.intake || {};
  const existingGid = s(build.fields[COS_FIELD_NAMES.asanaTaskGid]).trim();
  const flags: string[] = [];

  await safeUpdate(recordId, { status: COS_STATUS.Drafting }, flags);

  const subNiche = s(intake.subNiche), competitiveSet = s(intake.competitiveSet), audience = s(intake.audience);
  const business = s(intake.business), diffInput = s(intake.differentiation);
  const voiceRefs = s(intake.voiceReferences), dmSample = s(intake.dmSample), personalityCues = s(intake.personalityCues);
  const capacity = s(intake.capacity), publisher = s(intake.publisher), tools = s(intake.tools), goals = s(intake.goals);
  const creatorName = s(intake.creatorName) || s(build.fields[COS_FIELD_NAMES.creatorName]);

  // A. Category scan (Perplexity)
  let categoryScan = "";
  try { categoryScan = await runPerplexity(catScanPrompt(subNiche, competitiveSet, audience), { maxTokens: 1200 }); }
  catch (e) { flags.push(`category_scan: ${(e as Error).message}`); }
  if (categoryScan) await safeUpdate(recordId, { categoryScan }, flags);

  // Prompt Package — written EARLY so a truncated run is always recoverable by hand.
  const promptPackage = buildPromptPackage(
    { creatorName, subNiche, competitiveSet, audience, business, diffInput, voiceRefs, dmSample, personalityCues, capacity, publisher, tools, goals },
    categoryScan,
  );
  await safeUpdate(recordId, { promptPackage }, flags);

  // B. Foundation
  const foundationObj = await draftWithGate<any>("foundation",
    () => runOpenAIJSON(JSON_SYS, foundationPrompt(business, diffInput, audience, subNiche, competitiveSet, categoryScan)),
    foundationGate, flags);
  const foundationText = s(foundationObj?.foundation);
  const differentiationStore = s(foundationObj?.only_sentence) || s(foundationObj?.differentiation);
  if (foundationText || differentiationStore) {
    await safeUpdate(recordId, { foundation: foundationText, differentiation: differentiationStore }, flags);
  }

  // C. Pillars
  const pillarsObj = await draftWithGate<any>("pillars",
    () => runOpenAIJSON(JSON_SYS, pillarsPrompt(foundationText, differentiationStore, categoryScan, competitiveSet)),
    pillarsGate, flags);
  const pillars: any[] = Array.isArray(pillarsObj?.pillars) ? pillarsObj.pillars : [];
  if (pillarsObj) await safeUpdate(recordId, { pillarsJson: JSON.stringify(pillarsObj) }, flags);

  // D. Voice
  const voiceObj = await draftWithGate<any>("voice",
    () => runOpenAIJSON(JSON_SYS, voicePrompt(voiceRefs, dmSample, personalityCues, foundationText)),
    (v) => voiceGate(v, dmSample), flags);
  if (voiceObj) await safeUpdate(recordId, { voiceJson: JSON.stringify(voiceObj) }, flags);

  // E. Cadence
  const pillarNames = pillars.map((p) => s(p?.name)).filter(Boolean).join(", ");
  const cadenceObj = await draftWithGate<any>("cadence",
    () => runOpenAIJSON(JSON_SYS, cadencePrompt(pillarNames || "(pillars unavailable)", capacity, publisher, tools, goals)),
    (v) => cadenceGate(v, capacity), flags);
  if (cadenceObj) await safeUpdate(recordId, { cadenceJson: JSON.stringify(cadenceObj) }, flags);

  // F. Operating Manual (code-assembled)
  const manualHTML = buildManualHTML({ creatorName, foundationText, differentiation: differentiationStore, pillars, voice: voiceObj, cadence: cadenceObj });
  await safeUpdate(recordId, { operatingManualHtml: manualHTML, formatStatus: COS_FORMAT_STATUS.PendingFigmaSwap }, flags);

  // H. Persist full blob + mark ready
  const buildJSON = JSON.stringify({ categoryScan, foundation: foundationObj, pillars: pillarsObj, voice: voiceObj, cadence: cadenceObj, flags });
  await safeUpdate(recordId, { buildJson: buildJSON, status: COS_STATUS.ReadyForReview }, flags);

  // I. Asana review task (only if not already stamped — keeps re-runs from duplicating)
  if (!existingGid) {
    await createAsanaTask(recordId, { creatorName, handle: s(intake.handle), email: s(intake.email), pillarsCount: pillars.length, flags });
  }
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  const recordId = typeof body?.recordId === "string" ? body.recordId : "";
  if (!recordId) return Response.json({ error: "Missing recordId." }, { status: 400 });

  // Ack immediately; run the chain after the response (counts toward maxDuration).
  after(async () => {
    try { await runGenerate(recordId); }
    catch (e) { console.error("generate-content-os chain failed", (e as Error).message); }
  });
  return Response.json({ ok: true, recordId, started: true }, { status: 202 });
}
