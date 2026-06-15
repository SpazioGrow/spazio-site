// Brand Intelligence Brief generator.
// Fetches a Foundation report + linked lead from Airtable, calls Perplexity
// for research-backed brand strategy, assembles a 3-page HTML brief, and
// saves it back to Airtable before returning.

export const maxDuration = 60; // Perplexity research queries can be slow

const BASE      = "https://api.airtable.com/v0/appv2sIRwDvNPjV7j";
const REPORTS   = `${BASE}/tbl7hxUDQRJLjUpKQ`;
const LEADS     = `${BASE}/tbl5qLZO9mAN9LQ0P`;

const RF = {
  lead:      "flduD1QjX8XxucINU",
  answers:   "fldgTPk5L6fnvZzZo",
  status:    "fldLUKmsHhqidDFWb",
  briefHtml: "fld3ZgwxOlFRK27Qx",
} as const;

const LF = {
  name:    "fldcNCcvpv3UYK7sR",
  email:   "fld8bcTQhFU2ZBxKS",
  company: "fldK7UmiFjbqxuibh",
  website: "fldJeI9yMHWp9CMaI",
  service: "fld15eMrZbh2n8Kev",
} as const;

// ── Airtable helpers ────────────────────────────────────────────────────────

function atHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function atGet(url: string, token: string) {
  const res = await fetch(url, { headers: atHeaders(token) });
  if (!res.ok) throw new Error(`Airtable GET ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ fields: Record<string, unknown> }>;
}

async function atPatch(table: string, recordId: string, fields: Record<string, unknown>, token: string) {
  const res = await fetch(`${table}/${recordId}`, {
    method: "PATCH",
    headers: atHeaders(token),
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable PATCH → ${res.status}: ${await res.text()}`);
}

// ── Perplexity ───────────────────────────────────────────────────────────────

type StrategyDoc = {
  businessSummary:          string;
  audienceOverview:         string;
  keyChallenge:             string;
  marketObservations:       string[];
  positioningStatement:     string;
  differentiators:          string[];
  strategicRecommendations: string[];
};

const SYSTEM_PROMPT = `You are a senior brand strategist and creative consultant at Spazio, a digital design agency. \
You produce research-backed brand strategy documents for founders, startups, and growing brands. \
Your role is that of a human expert conducting market research and strategic analysis — not an AI automation tool. \
Write with confidence, precision, and authority. Avoid filler phrases like "it's important to note" or "leveraging synergies". \
Back every strategic claim with observable market reality. When you have web search results available, use them. \
Return only the structured JSON requested — no preamble, no markdown fences, no commentary outside the JSON object.`;

function buildPrompt(lead: Record<string, unknown>, answers: Record<string, unknown>): { system: string; user: string } {
  const shaping       = (answers.shaping       ?? {}) as Record<string, string>;
  const direction     = (answers.direction     ?? {}) as Record<string, unknown>;
  const visualLanguage = (answers.visualLanguage ?? {}) as Record<string, unknown>;
  const output        = (answers.output        ?? {}) as Record<string, string>;
  const context       = (answers.context       ?? {}) as Record<string, unknown>;

  const clientName    = String(lead[LF.name]    ?? "").trim() || "the client";
  const company       = String(lead[LF.company] ?? "").trim();
  const website       = String(lead[LF.website] ?? "").trim();
  const serviceInt    = String(lead[LF.service] ?? "").trim();

  const perceptions   = Array.isArray(direction.target_perception) ? direction.target_perception.join(", ") : "";
  const emotion       = String(direction.emotional_outcome ?? "").trim();
  const metaphor      = String(direction.metaphor ?? "").trim();
  const avoidList     = String(visualLanguage.avoid_list ?? "").trim();
  const competitors   = String(context.competitors ?? "").trim();
  const cultural      = Array.isArray(context.cultural_inspiration) ? context.cultural_inspiration.join(", ") : "";

  const user = `CLIENT BRIEF — research and produce a brand strategy document for this client.

CLIENT:
- Name: ${clientName}${company ? ` / ${company}` : ""}${website ? ` — ${website}` : ""}
- Service: ${serviceInt || shaping.project_type || "Brand Identity"}
- Project type: ${shaping.project_type || "Brand Identity"}
- Industry / category: ${shaping.industry || "Not specified"}
- Goal: ${shaping.goal || "Not specified"}
- Desired brand perceptions: ${perceptions || "Not specified"}
- Emotional outcome for audience: ${emotion || "Not specified"}
- Brand metaphor / personality: ${metaphor || "Not specified"}
- Visual avoidances: ${avoidList || "None stated"}
- Creative output: ${output.direction_count || 3} directions, ${output.boldness_level || "Balanced"} boldness${competitors ? `\n- Competitive benchmarks: ${competitors}` : ""}${cultural ? `\n- Cultural touchstones: ${cultural}` : ""}

Use your web search to research this category, competitors, and market trends. Then return this JSON object exactly:

{
  "businessSummary": "2–3 sentences: what this client does, their category, current market position",
  "audienceOverview": "2–3 sentences: primary audience — who they are, what they value, what they respond to",
  "keyChallenge": "1–2 sentences: the central brand challenge or opportunity this project must resolve",
  "marketObservations": [
    "specific, research-backed observation about the market or competitive landscape",
    "a gap, shift, or tension in the category worth exploiting",
    "an audience behaviour or expectation relevant to this project",
    "a trend or emerging signal that affects the brand direction"
  ],
  "positioningStatement": "A single declarative positioning statement — specific, differentiated, ownable",
  "differentiators": [
    "differentiator 1 — short, concrete",
    "differentiator 2",
    "differentiator 3"
  ],
  "strategicRecommendations": [
    "Actionable recommendation tied to research findings",
    "Second recommendation",
    "Third recommendation",
    "Fourth recommendation"
  ]
}`;

  return { system: SYSTEM_PROMPT, user };
}

async function callPerplexity(
  { system, user }: { system: string; user: string },
  apiKey: string,
): Promise<StrategyDoc> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Perplexity ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned) as StrategyDoc;
}

// ── HTML brief builder ───────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function li(items: string[]): string {
  return items.map((i) => `<li>${esc(i)}</li>`).join("\n");
}

function buildHTML(
  strategy: StrategyDoc,
  lead: Record<string, unknown>,
  answers: Record<string, unknown>,
  reportRef: string,
): string {
  const shaping   = (answers.shaping   ?? {}) as Record<string, string>;
  const direction = (answers.direction ?? {}) as Record<string, unknown>;
  const visLang   = (answers.visualLanguage ?? {}) as Record<string, unknown>;
  const output    = (answers.output    ?? {}) as Record<string, string>;
  const context   = (answers.context   ?? {}) as Record<string, unknown>;

  const clientName  = esc(String(lead[LF.name]    ?? "").trim() || "Client");
  const company     = esc(String(lead[LF.company] ?? "").trim());
  const displayName = company || clientName;
  const today       = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const projectType = esc(shaping.project_type || "Brand Identity");
  const industry    = esc(shaping.industry || "—");
  const goal        = esc(shaping.goal || "");
  const boldness    = esc(String(output.boldness_level || "Balanced"));
  const dirCount    = esc(String(output.direction_count || 3));
  const perceptions = Array.isArray(direction.target_perception) ? (direction.target_perception as string[]).map(esc) : [];
  const materials   = Array.isArray(visLang.materials) ? (visLang.materials as string[]).map(esc) : [];
  const visualRefs  = Array.isArray(visLang.visual_references) ? (visLang.visual_references as string[]).map(esc) : [];
  const cultural    = Array.isArray(context.cultural_inspiration) ? (context.cultural_inspiration as string[]).map(esc) : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brand Intelligence Report — ${displayName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&display=swap" rel="stylesheet">
<style>
:root {
  --ink:     #17160F;
  --ink-2:   #514E44;
  --ink-3:   #847F71;
  --bg:      #F4F1E9;
  --surface: #FBF9F3;
  --line:    #DFD9C9;
  --accent:  #3E7D5A;
  --accent-soft: #EFF5F1;
  --accent-deep: #2A5740;
  --sans: "DM Sans", system-ui, sans-serif;
  --serif: "Fraunces", Georgia, serif;
}

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

/* ── Page shell ── */
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 40px;
}

.page-break {
  border: none;
  border-top: 2px solid var(--line);
  margin: 64px 0;
  page-break-after: always;
}

@media print {
  .page-break { border: none; margin: 0; }
  .page { padding: 0; }
}

/* ── Cover header ── */
.cover {
  display: flex;
  flex-direction: column;
  min-height: 340px;
  padding: 56px 0 48px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 56px;
}

.cover-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
}

.wordmark {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.ref-tag {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.cover-title {
  font-family: var(--serif);
  font-weight: 300;
  font-style: italic;
  font-size: clamp(36px, 5vw, 56px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0 0 10px;
}

.cover-client {
  font-family: var(--sans);
  font-size: 18px;
  font-weight: 500;
  color: var(--accent-deep);
  letter-spacing: -0.01em;
  margin: 0 0 32px;
}

.cover-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  background: var(--accent-soft);
  color: var(--accent-deep);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}

.cover-date {
  margin-top: auto;
  padding-top: 32px;
  font-size: 12px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

/* ── Section chrome ── */
.section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 28px;
}

.section-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}

.page-title {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(28px, 3.5vw, 40px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 0 40px;
  color: var(--ink);
}

/* ── Strategy grid ── */
.strategy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.strategy-cell {
  padding: 24px 28px;
  border: 1px solid var(--line);
  margin: -1px 0 0 -1px;
}

.strategy-cell:first-child { margin-top: 0; }

.strategy-cell.full {
  grid-column: span 2;
}

.cell-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 10px;
}

.cell-value {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink);
}

.cell-value.large {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(18px, 2.2vw, 23px);
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--accent-deep);
}

/* ── Lists ── */
.insight-list, .rec-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.insight-list li {
  padding-left: 18px;
  position: relative;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--ink-2);
}

.insight-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.rec-list li {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 12px;
  align-items: start;
}

.rec-num {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
  padding-top: 2px;
  font-variant-numeric: tabular-nums;
}

.rec-text {
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--ink-2);
}

/* ── Differentiators ── */
.diff-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.diff-tag {
  padding: 8px 16px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
}

/* ── Section spacer ── */
.section { margin-bottom: 52px; }

/* ── Placeholder pages ── */
.placeholder-box {
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 48px 40px;
  text-align: center;
  background: var(--surface);
  margin-bottom: 28px;
}

.placeholder-box .ph-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
  color: var(--accent);
}

.placeholder-box .ph-title {
  font-family: var(--serif);
  font-style: italic;
  font-weight: 300;
  font-size: 22px;
  color: var(--ink-2);
  margin: 0 0 8px;
}

.placeholder-box .ph-note {
  font-size: 13px;
  color: var(--ink-3);
  margin: 0;
}

/* ── Brief data table (Page 3) ── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table td {
  padding: 12px 16px;
  border: 1px solid var(--line);
  vertical-align: top;
}

.data-table td:first-child {
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
  width: 160px;
  background: var(--surface);
}

/* ── Footer ── */
.brief-footer {
  border-top: 1px solid var(--line);
  padding: 24px 0 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.brief-footer strong { color: var(--accent-deep); }

/* chips inline */
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-sm {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 12px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
}

@media (max-width: 600px) {
  .strategy-grid { grid-template-columns: 1fr; }
  .strategy-cell.full { grid-column: span 1; }
  .page { padding: 0 20px; }
}
</style>
</head>
<body>
<div class="page">

  <!-- ── COVER ── -->
  <div class="cover">
    <div class="cover-meta">
      <span class="wordmark">Spazio</span>
      <span class="ref-tag">${esc(reportRef)}</span>
    </div>
    <h1 class="cover-title">Brand Intelligence<br>Report</h1>
    <p class="cover-client">${displayName}</p>
    <div class="cover-pills">
      <span class="pill">${projectType}</span>
      ${industry !== "—" ? `<span class="pill">${industry}</span>` : ""}
      <span class="pill">${dirCount} directions · ${boldness}</span>
    </div>
    <p class="cover-date">Prepared ${today} &nbsp;·&nbsp; Confidential</p>
  </div>

  <!-- ══════════════════════════════════════════
       PAGE 1 — BRAND STRATEGY SNAPSHOT
  ══════════════════════════════════════════ -->

  <div class="section-label">01 &nbsp; Brand Strategy Snapshot</div>
  <h2 class="page-title">Where you stand.<br><em>Where you could go.</em></h2>

  <!-- Business summary + audience -->
  <div class="section">
    <div class="strategy-grid">
      <div class="strategy-cell full">
        <p class="cell-label">Business Summary</p>
        <p class="cell-value">${esc(strategy.businessSummary)}</p>
      </div>
      <div class="strategy-cell">
        <p class="cell-label">Audience Overview</p>
        <p class="cell-value">${esc(strategy.audienceOverview)}</p>
      </div>
      <div class="strategy-cell">
        <p class="cell-label">Key Challenge / Opportunity</p>
        <p class="cell-value">${esc(strategy.keyChallenge)}</p>
      </div>
    </div>
  </div>

  <!-- Market observations -->
  <div class="section">
    <p class="cell-label" style="margin-bottom: 16px;">Market Observations</p>
    <ul class="insight-list">
      ${li(strategy.marketObservations)}
    </ul>
  </div>

  <!-- Positioning statement -->
  <div class="section">
    <div class="strategy-cell full" style="border: 1px solid var(--line); padding: 28px 32px;">
      <p class="cell-label">Brand Positioning Statement</p>
      <p class="cell-value large">${esc(strategy.positioningStatement)}</p>
    </div>
  </div>

  <!-- Differentiators -->
  <div class="section">
    <p class="cell-label" style="margin-bottom: 14px;">Differentiators</p>
    <div class="diff-row">
      ${strategy.differentiators.map((d) => `<span class="diff-tag">${esc(d)}</span>`).join("\n      ")}
    </div>
  </div>

  <!-- Strategic recommendations -->
  <div class="section">
    <p class="cell-label" style="margin-bottom: 16px;">Strategic Recommendations</p>
    <ul class="rec-list">
      ${strategy.strategicRecommendations.map((r, i) => `<li>
        <span class="rec-num">0${i + 1}</span>
        <span class="rec-text">${esc(r)}</span>
      </li>`).join("\n      ")}
    </ul>
  </div>

  <hr class="page-break">

  <!-- ══════════════════════════════════════════
       PAGE 2 — CREATIVE DIRECTION
  ══════════════════════════════════════════ -->

  <div class="section-label">02 &nbsp; Creative Direction</div>
  <h2 class="page-title">The territories<br><em>we'll explore.</em></h2>

  ${perceptions.length > 0 ? `
  <div class="section">
    <p class="cell-label" style="margin-bottom: 12px;">Desired Perception</p>
    <div class="chip-row">
      ${perceptions.map((p) => `<span class="chip-sm">${p}</span>`).join(" ")}
    </div>
  </div>` : ""}

  <div class="placeholder-box">
    <div class="ph-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
      </svg>
    </div>
    <p class="ph-title">Mood board &amp; visual territories</p>
    <p class="ph-note">Visual directions will appear here in the next phase —<br>curated imagery, colour palettes, and typographic systems.</p>
  </div>

  ${(materials.length > 0 || visualRefs.length > 0) ? `
  <div class="section">
    ${visualRefs.length > 0 ? `
    <p class="cell-label" style="margin-bottom: 12px; margin-top: 24px;">Visual References</p>
    <div class="chip-row">
      ${visualRefs.map((r) => `<span class="chip-sm">${r}</span>`).join(" ")}
    </div>` : ""}
    ${materials.length > 0 ? `
    <p class="cell-label" style="margin-bottom: 12px; margin-top: 24px;">Material Language</p>
    <div class="chip-row">
      ${materials.map((m) => `<span class="chip-sm">${m}</span>`).join(" ")}
    </div>` : ""}
  </div>` : ""}

  <hr class="page-break">

  <!-- ══════════════════════════════════════════
       PAGE 3 — EXECUTION FRAMEWORK
  ══════════════════════════════════════════ -->

  <div class="section-label">03 &nbsp; Execution Framework</div>
  <h2 class="page-title">Brief summary &amp;<br><em>next steps.</em></h2>

  <div class="section">
    <div class="placeholder-box">
      <div class="ph-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
        </svg>
      </div>
      <p class="ph-title">Colour palette &amp; typographic system</p>
      <p class="ph-note">Palette extraction and type pairing will be added<br>once visual territories are confirmed.</p>
    </div>
  </div>

  <!-- Brief data capture -->
  <div class="section">
    <p class="cell-label" style="margin-bottom: 16px;">Brief on Record</p>
    <table class="data-table">
      <tbody>
        <tr><td>Client</td><td>${displayName}</td></tr>
        <tr><td>Project</td><td>${projectType}</td></tr>
        <tr><td>Industry</td><td>${industry}</td></tr>
        <tr><td>Goal</td><td>${goal || "—"}</td></tr>
        <tr><td>Output</td><td>${dirCount} creative directions &nbsp;·&nbsp; ${boldness}</td></tr>
        ${cultural.length > 0 ? `<tr><td>Culture</td><td>${cultural.join(", ")}</td></tr>` : ""}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="brief-footer">
    <span>© ${new Date().getFullYear()} <strong>Spazio</strong> — Confidential client document</span>
    <span>${esc(reportRef)} &nbsp;·&nbsp; ${today}</span>
  </div>

</div>
</body>
</html>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const airtableToken = process.env.AIRTABLE_TOKEN;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (!airtableToken) {
    return Response.json({ error: "AIRTABLE_TOKEN not configured." }, { status: 500 });
  }
  if (!perplexityKey) {
    return Response.json({ error: "PERPLEXITY_API_KEY not configured." }, { status: 500 });
  }

  let reportId: string;
  try {
    const body = (await request.json()) as { reportId?: string };
    reportId = body.reportId ?? "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!reportId) {
    return Response.json({ error: "reportId is required." }, { status: 400 });
  }

  // 1. Fetch the report record
  let report: { fields: Record<string, unknown> };
  try {
    report = await atGet(`${REPORTS}/${reportId}`, airtableToken);
  } catch (err) {
    console.error("Failed to fetch report:", err);
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  const reportFields = report.fields;
  // RF.reportId is the "Report ID" primary field (e.g. "BIR-XXXXX"); fall back to truncated record ID
  const reportRef    = String(reportFields["fldDIew0Hh6uWyy7Z"] || reportId).slice(0, 16).toUpperCase();

  // 2. Get the linked lead ID
  const linkedLeads = reportFields[RF.lead];
  const leadId      = Array.isArray(linkedLeads) ? String(linkedLeads[0]) : null;
  if (!leadId) {
    return Response.json({ error: "Report has no linked lead." }, { status: 422 });
  }

  // 3. Fetch lead data
  let leadRecord: { fields: Record<string, unknown> };
  try {
    leadRecord = await atGet(`${LEADS}/${leadId}`, airtableToken);
  } catch (err) {
    console.error("Failed to fetch lead:", err);
    return Response.json({ error: "Could not retrieve lead data." }, { status: 502 });
  }
  const lead = leadRecord.fields;

  // 4. Parse questionnaire answers
  let answers: Record<string, unknown> = {};
  try {
    const raw = String(reportFields[RF.answers] ?? "{}");
    answers = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.warn("Could not parse answers JSON — proceeding with empty answers");
  }

  // 5. Mark as Processing
  try {
    await atPatch(REPORTS, reportId, { [RF.status]: "Processing" }, airtableToken);
  } catch (err) {
    console.warn("Could not set Processing status:", err);
  }

  // 6. Call Perplexity
  let strategy: StrategyDoc;
  try {
    const prompt = buildPrompt(lead, answers);
    strategy = await callPerplexity(prompt, perplexityKey);
  } catch (err) {
    console.error("Perplexity failed:", err);
    await atPatch(REPORTS, reportId, { [RF.status]: "Draft" }, airtableToken).catch(() => {});
    return Response.json(
      { error: "Strategy generation failed. Please try again." },
      { status: 502 },
    );
  }

  // 7. Build HTML brief
  const html = buildHTML(strategy, lead, answers, reportRef);

  // 8. Save to Airtable + mark Complete
  try {
    await atPatch(
      REPORTS,
      reportId,
      { [RF.briefHtml]: html, [RF.status]: "Complete" },
      airtableToken,
    );
  } catch (err) {
    console.error("Failed to save brief to Airtable:", err);
    // Return the HTML even if save fails — client can still use it
  }

  return Response.json({ ok: true, html }, { status: 200 });
}
