// Phase 2.3 — Brand Intelligence Report: Imagery & Visual Assembly
// POST { answers } → create Airtable record, generate 3-page HTML brief, return { html, recordId }
// POST { recordId } → fetch existing record, regenerate brief, return { html, recordId }

const AT_BASE  = "appv2sIRwDvNPjV7j";
const AT_TABLE = "tbl7hxUDQRJLjUpKQ";
const AT_URL   = `https://api.airtable.com/v0/${AT_BASE}/${AT_TABLE}`;

const F = {
  reportId:  "fldDIew0Hh6uWyy7Z",
  answers:   "fldgTPk5L6fnvZzZo",
  status:    "fldLUKmsHhqidDFWb",
  briefHtml: "fld3ZgwxOlFRK27Qx",
} as const;

type BriefAnswers = {
  project_type:         string;
  industry:             string;
  goal:                 string;
  target_perception:    string[];
  emotional_outcome:    string;
  metaphor:             string;
  visual_references:    string[];
  materials:            string[];
  lighting:             string;
  avoid_list:           string;
  direction_count:      number;
  boldness_level:       string;
  competitors:          string;
  cultural_inspiration: string[];
};

// ── Airtable helpers ────────────────────────────────────────────────────────

type ATRecord = { id: string; fields: Record<string, unknown> };

async function atFetch(recordId: string, token: string): Promise<ATRecord> {
  const res = await fetch(`${AT_URL}/${recordId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Airtable GET ${res.status}`);
  return res.json() as Promise<ATRecord>;
}

async function atCreate(answers: BriefAnswers, token: string): Promise<ATRecord> {
  const prefix = ((answers.industry || answers.project_type || "SPZ")
    .replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SPZ");
  const humanId = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

  const res = await fetch(AT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      records: [{ fields: {
        [F.reportId]:  humanId,
        [F.answers]:   JSON.stringify(answers, null, 2),
        [F.status]:    "Processing",
      }}],
      typecast: true,
    }),
  });
  if (!res.ok) throw new Error(`Airtable POST ${res.status}`);
  const data = await res.json() as { records: ATRecord[] };
  return data.records[0];
}

async function atUpdate(recordId: string, html: string, token: string): Promise<void> {
  const res = await fetch(`${AT_URL}/${recordId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: { [F.briefHtml]: html, [F.status]: "Complete" },
      typecast: true,
    }),
  });
  if (!res.ok) throw new Error(`Airtable PATCH ${res.status}: ${await res.text()}`);
}

// ── Brief content helpers ───────────────────────────────────────────────────

const PALETTES: Record<string, Array<{ hex: string; name: string }>> = {
  "Luxury":         [{ hex:"#1A1A2E",name:"Deep Night" },{ hex:"#C9A84C",name:"Antique Gold" },{ hex:"#F4EDD3",name:"Parchment" },{ hex:"#6B4F3A",name:"Cognac" },{ hex:"#E8E0D0",name:"Warm Ivory" },{ hex:"#2C2C2C",name:"Charcoal" }],
  "Minimal":        [{ hex:"#1A1A1A",name:"Ink Black" },{ hex:"#F5F5F3",name:"Off White" },{ hex:"#8A8A8A",name:"Mid Grey" },{ hex:"#D4D4D4",name:"Silver" },{ hex:"#FAFAFA",name:"Pure White" },{ hex:"#2E2E2E",name:"Charcoal" }],
  "Futuristic":     [{ hex:"#0A0E27",name:"Deep Space" },{ hex:"#00D4FF",name:"Electric Blue" },{ hex:"#7B2FBE",name:"Neon Violet" },{ hex:"#1C1C3A",name:"Dark Navy" },{ hex:"#C8C8C8",name:"Chrome" },{ hex:"#00FF87",name:"Signal Green" }],
  "Experimental":   [{ hex:"#FF4D00",name:"Ignite" },{ hex:"#1A1A1A",name:"Carbon" },{ hex:"#E8FF00",name:"Voltage" },{ hex:"#8B00FF",name:"Electric Indigo" },{ hex:"#FF006E",name:"Signal Pink" },{ hex:"#FAFAFA",name:"White Noise" }],
  "Sustainable":    [{ hex:"#2D5A27",name:"Forest" },{ hex:"#C4703A",name:"Terracotta" },{ hex:"#F4EDD3",name:"Oat" },{ hex:"#8B9D77",name:"Sage" },{ hex:"#D4C4A0",name:"Natural Linen" },{ hex:"#1A2F1A",name:"Deep Earth" }],
  "Heritage-driven":[{ hex:"#6B2737",name:"Burgundy" },{ hex:"#C4912A",name:"Aged Gold" },{ hex:"#F0E6C8",name:"Aged Ivory" },{ hex:"#2B4A3A",name:"Forest Ink" },{ hex:"#8B4513",name:"Saddle Brown" },{ hex:"#1A1A0A",name:"Inkwell" }],
};

const CREATIVE_THEMES: Record<string, string> = {
  "Luxury":         "The Art of Restraint",
  "Minimal":        "Clarity in Silence",
  "Futuristic":     "Tomorrow's Vernacular",
  "Experimental":   "Controlled Disruption",
  "Sustainable":    "Nature as North Star",
  "Heritage-driven":"Earned Authority",
};

function getPalette(answers: BriefAnswers) {
  return PALETTES[answers.target_perception[0]] ?? [
    { hex:"#ADE514",name:"Spazio Lime" },{ hex:"#1C2418",name:"Spazio Ink" },
    { hex:"#F4F1E9",name:"Warm Cream" },{ hex:"#8B9D77",name:"Sage Green" },
    { hex:"#C4912A",name:"Warm Gold" },{ hex:"#F0E6C8",name:"Parchment" },
  ];
}

function getMoodImages(answers: BriefAnswers): Array<{ url: string; caption: string }> {
  const slots = [
    { kw: `${answers.industry},brand,design`,                      cap: `${answers.industry} brand context` },
    { kw: `${answers.target_perception[0] || "luxury"},minimal`,   cap: `${answers.target_perception[0] || "Primary"} aesthetic` },
    { kw: `${answers.materials[0] || "texture"},material,detail`,  cap: `${answers.materials[0] || "Material"} texture` },
    { kw: `${answers.lighting || "studio"},photography,light`,     cap: `${answers.lighting || "Studio"} lighting` },
    { kw: `${answers.visual_references[0] || "architecture"},design,aesthetic`, cap: `${answers.visual_references[0] || "Reference"} influence` },
    { kw: `${answers.target_perception[1] || answers.industry},creative,mood`,  cap: `${answers.target_perception[1] || "Secondary"} mood` },
  ];
  return slots.map(({ kw, cap }, i) => {
    const q = kw.toLowerCase().replace(/[^a-z,\s]/g, "").replace(/\s+/g, "+").replace(/,+/g, ",");
    return { url: `https://loremflickr.com/640/400/${q}?lock=${i + 1}`, caption: cap };
  });
}

function getCompetitors(raw: string): Array<{ name: string; domain: string }> {
  if (!raw.trim()) return [];
  return raw.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean).slice(0, 4).map(entry => {
    const m = entry.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})/);
    if (m) return { name: m[1], domain: m[1] };
    const domain = entry.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + ".com";
    return { name: entry, domain };
  });
}

function boldnessPos(level: string): number {
  return level === "Conservative" ? 15 : level === "Experimental" ? 85 : 50;
}

function principles(answers: BriefAnswers): string[] {
  const p: string[] = [];
  if (answers.emotional_outcome) p.push(`Evoke ${answers.emotional_outcome.toLowerCase()} at every touchpoint`);
  if (answers.target_perception[0]) p.push(`Lead with a ${answers.target_perception[0].toLowerCase()} visual register`);
  if (answers.materials[0]) p.push(`Draw material vocabulary from ${answers.materials[0].toLowerCase()}`);
  if (answers.lighting) p.push(`${answers.lighting} as the primary photographic language`);
  if (answers.boldness_level === "Experimental") p.push("Break expected category conventions deliberately");
  else if (answers.boldness_level === "Conservative") p.push("Build trust through consistency and restraint");
  else p.push("Balance innovation with approachability");
  return p.slice(0, 5);
}

function recommendations(answers: BriefAnswers): string[] {
  const r = [
    `Establish a unified visual identity system with clear typographic and color hierarchy`,
    `Define a distinctive tone of voice calibrated to your ${answers.emotional_outcome || "brand"} positioning`,
    `Differentiate clearly from ${answers.competitors ? answers.competitors.split(/[,\n]/)[0].trim() : "market alternatives"} through considered creative distinction`,
    `Build a scalable system that works from digital-first to print and packaging`,
  ];
  if (answers.cultural_inspiration.length > 0) {
    r.push(`Draw cultural intelligence from ${answers.cultural_inspiration.slice(0, 2).join(" and ")}`);
  }
  return r.slice(0, 4);
}

// ── HTML builder ────────────────────────────────────────────────────────────

function buildBriefHtml(answers: BriefAnswers, refId: string): string {
  const palette     = getPalette(answers);
  const images      = getMoodImages(answers);
  const competitors = getCompetitors(answers.competitors);
  const recs        = recommendations(answers);
  const prncpls     = principles(answers);
  const bPos        = boldnessPos(answers.boldness_level);
  const theme       = answers.metaphor
    ? `“${answers.metaphor}”`
    : (CREATIVE_THEMES[answers.target_perception[0]] ?? "Purposeful Distinctiveness");
  const today       = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const titleIndustry = answers.industry || answers.project_type || "Brand";

  const paletteSwatches = palette.map(c => {
    const isLight = parseInt(c.hex.slice(1, 3), 16) > 160;
    return `<div style="flex:1;min-width:80px"><div style="height:72px;border-radius:8px;background:${c.hex};border:1px solid rgba(0,0,0,0.06)"></div><p style="margin:8px 0 2px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:#888">${c.hex.toUpperCase()}</p><p style="margin:0;font-size:13px;font-weight:500;color:#1C2418">${c.name}</p></div>`;
  }).join("");

  const moodGrid = images.map(img => `<div style="break-inside:avoid"><img src="${img.url}" alt="${img.caption}" loading="lazy" onerror="this.style.background='#E8E4DC';this.removeAttribute('src')" style="width:100%;height:180px;object-fit:cover;border-radius:8px;display:block;background:#E8E4DC"><p style="margin:6px 0 0;font-size:11.5px;color:#847F71;letter-spacing:.04em">${img.caption}</p></div>`).join("");

  const competitorGrid = competitors.length > 0
    ? competitors.map(c => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 16px;background:#fff;border:1px solid #E4DFD1;border-radius:10px;text-align:center"><img src="https://logo.clearbit.com/${c.domain}?size=80" alt="${c.name} logo" loading="lazy" onerror="this.style.display='none'" style="width:56px;height:56px;object-fit:contain"><p style="margin:0;font-size:13px;font-weight:500;color:#17160F">${c.name}</p></div>`).join("")
    : `<p style="color:#847F71;font-size:14px;grid-column:1/-1">No competitor references provided — an open field to define the category.</p>`;

  const pList = prncpls.map(p => `<li style="padding:10px 0;border-bottom:1px solid #E4DFD1;font-size:15px;color:#17160F;line-height:1.5">${p}</li>`).join("");
  const recList = recs.map(r => `<li style="padding:8px 0 8px 0;font-size:14.5px;color:#17160F;line-height:1.55">${r}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Spazio Brand Intelligence Report™ — ${titleIndustry}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--lime:#ADE514;--ink:#1C2418;--cream:#FBF9F3;--cream2:#F4F1E9;--line:#DFD9C9;--ink3:#847F71;--serif:'Fraunces',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;--mono:'DM Sans',monospace}
body{font-family:var(--sans);background:var(--cream2);color:var(--ink)}
.page{background:var(--cream);max-width:900px;margin:0 auto 40px;padding:clamp(40px,6vw,72px);position:relative;border:1px solid var(--line);border-radius:12px}
.cover{background:var(--ink);color:var(--cream);border:none;display:flex;flex-direction:column;justify-content:space-between;min-height:520px}
.section-label{font-family:var(--sans);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--lime);margin-bottom:8px}
.page-label{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.5}
h1{font-family:var(--serif);font-weight:500;font-size:clamp(36px,5vw,60px);line-height:1.05;letter-spacing:-.02em}
h2{font-family:var(--serif);font-weight:500;font-size:clamp(26px,3.5vw,38px);line-height:1.1;letter-spacing:-.02em;margin-bottom:28px}
h3{font-family:var(--serif);font-weight:500;font-size:20px;letter-spacing:-.01em;margin-bottom:14px}
.dot{width:10px;height:10px;border-radius:50%;background:var(--lime);display:inline-block}
.rule{height:1px;background:var(--line);border:none;margin:32px 0}
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:640px){.grid-2,.grid-3,.grid-4{grid-template-columns:repeat(2,1fr)}.page{padding:28px 20px}.mood-grid{columns:2!important}}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:20px 22px}
.tag{display:inline-block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:100px;border:1px solid rgba(173,229,20,.5);color:var(--lime);font-weight:600}
.spec-row{display:flex;gap:16px;padding:10px 0;border-bottom:1px solid var(--line);align-items:baseline}
.spec-label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);flex:0 0 130px}
.spectrum-bar{position:relative;height:6px;background:var(--line);border-radius:100px;margin:8px 0 4px}
.spectrum-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:var(--lime);box-shadow:0 0 0 3px rgba(173,229,20,.25)}
</style>
</head>
<body style="padding:clamp(16px,3vw,40px)">

<!-- ═══════════════ COVER ═══════════════ -->
<div class="page cover">
  <div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:clamp(40px,7vw,72px)">
      <span class="dot"></span>
      <span style="font-family:var(--serif);font-weight:500;font-size:20px;letter-spacing:-.02em;color:var(--cream)">Spazio</span>
    </div>
    <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(251,249,243,.45);margin-bottom:14px;font-weight:600">Brand Intelligence Report™</p>
    <h1 style="color:var(--cream);max-width:14ch">${titleIndustry}<em class="grace" style="font-style:italic;color:var(--lime)"> — ${answers.project_type || "Identity"}</em></h1>
    <p style="margin-top:22px;font-size:16px;line-height:1.6;color:rgba(251,249,243,.65);max-width:48ch">${answers.goal || `A strategic brand intelligence brief for ${titleIndustry}.`}</p>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;border-top:1px solid rgba(251,249,243,.15);padding-top:24px;margin-top:40px">
    <div>
      <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(251,249,243,.4);margin-bottom:4px">Reference</p>
      <p style="font-family:monospace;font-size:13px;color:rgba(251,249,243,.7)">${refId}</p>
    </div>
    <p style="font-size:13px;color:rgba(251,249,243,.4)">${today}</p>
  </div>
</div>

<!-- ═══════════════ PAGE 1 — BRAND STRATEGY SNAPSHOT ═══════════════ -->
<div class="page">
  <p class="page-label">01 / 03</p>
  <hr class="rule" style="margin-top:12px">

  <h2>Brand Strategy<br>Snapshot</h2>

  <div class="grid-2" style="gap:28px;margin-bottom:36px">
    <div>
      <p class="section-label">Business Summary</p>
      <p style="font-size:15.5px;line-height:1.6;color:var(--ink)">${answers.goal || "Awaiting brief input."}</p>
      ${answers.industry ? `<div class="spec-row" style="margin-top:16px"><span class="spec-label">Industry</span><span style="font-size:15px">${answers.industry}</span></div>` : ""}
      ${answers.project_type ? `<div class="spec-row"><span class="spec-label">Project type</span><span style="font-size:15px">${answers.project_type}</span></div>` : ""}
    </div>
    <div>
      <p class="section-label">Market Position</p>
      ${answers.target_perception.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${answers.target_perception.map(p => `<span style="padding:5px 12px;background:var(--cream2);border:1px solid var(--line);border-radius:100px;font-size:13px;font-weight:500">${p}</span>`).join("")}</div>` : ""}
      ${answers.emotional_outcome ? `<p style="font-size:15px;line-height:1.5;color:var(--ink);margin-bottom:8px">The brand should make people feel <strong>${answers.emotional_outcome.toLowerCase()}</strong>.</p>` : ""}
      ${answers.metaphor ? `<p style="font-size:13.5px;line-height:1.5;color:var(--ink3)">Creative metaphor: <em>${answers.metaphor}</em></p>` : ""}
    </div>
  </div>

  <hr class="rule">

  <div class="grid-2" style="gap:28px">
    <div>
      <p class="section-label">Brand Positioning</p>
      <p style="font-size:15px;line-height:1.6;color:var(--ink);margin-bottom:16px">
        ${titleIndustry} is positioned as a ${answers.target_perception.slice(0,2).join(", ").toLowerCase() || "distinctive"} presence in the ${answers.industry || "market"}.
        ${answers.emotional_outcome ? `The core emotional contract is ${answers.emotional_outcome.toLowerCase()}.` : ""}
        ${answers.boldness_level ? `Execution sits at a ${answers.boldness_level.toLowerCase()} level of creative boldness.` : ""}
      </p>
    </div>
    <div>
      <p class="section-label">Strategic Recommendations</p>
      <ul style="list-style:none;padding:0">${recList}</ul>
    </div>
  </div>

  ${answers.cultural_inspiration.length > 0 ? `
  <hr class="rule">
  <p class="section-label">Cultural Inspiration</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px">${answers.cultural_inspiration.map(c => `<span style="padding:5px 12px;background:var(--cream2);border:1px solid var(--line);border-radius:100px;font-size:13px">${c}</span>`).join("")}</div>
  ` : ""}

  <div style="margin-top:36px;padding:18px 20px;background:var(--cream2);border-radius:10px;border:1px solid var(--line)">
    <p style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px">Spazio Note</p>
    <p style="font-size:14px;line-height:1.6;color:var(--ink)"><strong>AI expands. Humans decide.</strong> This report is generated from your brief and reviewed by a Spazio designer before any direction is presented. The strategy above is a starting framework — creative territory is defined in partnership with you.</p>
  </div>
</div>

<!-- ═══════════════ PAGE 2 — CREATIVE DIRECTION ═══════════════ -->
<div class="page">
  <p class="page-label">02 / 03</p>
  <hr class="rule" style="margin-top:12px">

  <h2>Creative Direction</h2>

  <div style="margin-bottom:36px">
    <p class="section-label">Creative Theme</p>
    <p style="font-family:var(--serif);font-size:clamp(22px,3vw,32px);font-weight:300;font-style:italic;letter-spacing:-.01em;color:var(--ink);line-height:1.2">${theme}</p>
  </div>

  <hr class="rule">

  <div class="grid-2" style="gap:28px;margin-bottom:36px">
    <div>
      <p class="section-label">Design Principles</p>
      <ul style="list-style:none;padding:0;counter-reset:p">${pList}</ul>
    </div>
    <div>
      <p class="section-label">Art Direction</p>
      ${answers.lighting ? `<div class="spec-row"><span class="spec-label">Lighting</span><span style="font-size:15px">${answers.lighting}</span></div>` : ""}
      ${answers.materials.length > 0 ? `<div class="spec-row"><span class="spec-label">Materials</span><span style="font-size:15px">${answers.materials.join(", ")}</span></div>` : ""}
      ${answers.visual_references.length > 0 ? `<div class="spec-row"><span class="spec-label">References</span><span style="font-size:15px">${answers.visual_references.join(", ")}</span></div>` : ""}
      ${answers.avoid_list ? `<div class="spec-row"><span class="spec-label">Avoid</span><span style="font-size:15px;color:var(--ink3)">${answers.avoid_list}</span></div>` : ""}
    </div>
  </div>

  <hr class="rule">

  <p class="section-label" style="margin-bottom:16px">Mood Board</p>
  <div class="mood-grid" style="columns:3;gap:14px;column-gap:14px">${moodGrid}</div>
  <p style="font-size:12px;color:var(--ink3);margin-top:12px;letter-spacing:.03em">Images sourced from Flickr Creative Commons. Final photography direction defined in creative review.</p>

  <hr class="rule">

  <div>
    <p class="section-label" style="margin-bottom:16px">Brand Personality Spectrum</p>
    <div style="display:grid;gap:16px">
      ${[
        ["Luxury", "Accessible", bPos],
        ["Minimal", "Expressive", 100 - bPos],
      ].map(([a, b, pos]) => `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:13px;font-weight:500">${a}</span>
          <span style="font-size:13px;font-weight:500">${b}</span>
        </div>
        <div class="spectrum-bar"><div class="spectrum-dot" style="left:${pos}%"></div></div>
      </div>`).join("")}
    </div>
  </div>
</div>

<!-- ═══════════════ PAGE 3 — EXECUTION FRAMEWORK ═══════════════ -->
<div class="page">
  <p class="page-label">03 / 03</p>
  <hr class="rule" style="margin-top:12px">

  <h2>Execution Framework</h2>

  <p class="section-label" style="margin-bottom:16px">Color Palette</p>
  <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:36px">${paletteSwatches}</div>
  <p style="font-size:12px;color:var(--ink3);margin-bottom:0;margin-top:-20px">Palette derived from ${answers.target_perception[0] || "brand"} positioning. Final hex values confirmed in identity design phase.</p>

  <hr class="rule">

  <p class="section-label" style="margin-bottom:16px">Competitive Benchmark</p>
  <div class="grid-4" style="margin-bottom:36px">${competitorGrid}</div>

  <hr class="rule">

  <p class="section-label" style="margin-bottom:16px">Recommended Deliverables</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:36px">
    <thead>
      <tr style="background:var(--cream2)">
        <th style="text-align:left;padding:10px 14px;border-bottom:2px solid var(--line);font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)">Deliverable</th>
        <th style="text-align:left;padding:10px 14px;border-bottom:2px solid var(--line);font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)">Includes</th>
        <th style="text-align:center;padding:10px 14px;border-bottom:2px solid var(--line);font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)">Phase</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid var(--line)">
        <td style="padding:12px 14px;font-weight:500">Brand Identity</td>
        <td style="padding:12px 14px;color:var(--ink3)">Logo suite, color system, typography, brand mark</td>
        <td style="padding:12px 14px;text-align:center"><span style="padding:3px 10px;background:rgba(173,229,20,.15);border-radius:100px;font-size:11px;font-weight:600;color:#3E7D5A">Foundation</span></td>
      </tr>
      <tr style="border-bottom:1px solid var(--line)">
        <td style="padding:12px 14px;font-weight:500">Design System</td>
        <td style="padding:12px 14px;color:var(--ink3)">Component library, grid, motion principles, icons</td>
        <td style="padding:12px 14px;text-align:center"><span style="padding:3px 10px;background:rgba(28,36,24,.08);border-radius:100px;font-size:11px;font-weight:600;color:var(--ink)">Design</span></td>
      </tr>
      <tr>
        <td style="padding:12px 14px;font-weight:500">Launch Assets</td>
        <td style="padding:12px 14px;color:var(--ink3)">Social templates, email headers, website hero, print</td>
        <td style="padding:12px 14px;text-align:center"><span style="padding:3px 10px;background:rgba(196,145,42,.12);border-radius:100px;font-size:11px;font-weight:600;color:#8B4513">Launch</span></td>
      </tr>
    </tbody>
  </table>

  <hr class="rule">

  <p class="section-label" style="margin-bottom:16px">Phase Roadmap</p>
  <div class="grid-3" style="margin-bottom:36px">
    ${[
      ["01", "Foundation", "Brand positioning, identity system, core visual language"],
      ["02", "Design", "Component systems, templates, photography direction"],
      ["03", "Launch", "Campaign assets, digital presence, brand guidelines"],
    ].map(([n, title, desc]) => `<div class="card"><p style="font-family:monospace;font-size:11px;letter-spacing:.1em;color:var(--ink3);margin-bottom:8px">${n}</p><p style="font-family:var(--serif);font-weight:500;font-size:17px;margin-bottom:8px">${title}</p><p style="font-size:13.5px;line-height:1.5;color:var(--ink3)">${desc}</p></div>`).join("")}
  </div>

  <div style="background:var(--ink);color:var(--cream);border-radius:12px;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">
    <div>
      <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(173,229,20,.8);margin-bottom:8px">Recommended Package</p>
      <p style="font-family:var(--serif);font-size:clamp(20px,2.5vw,28px);font-weight:500;line-height:1.1">Brand Foundation<em style="color:var(--lime);font-style:italic"> — ${titleIndustry}</em></p>
    </div>
    <a href="/" style="display:inline-flex;align-items:center;gap:8px;background:var(--lime);color:var(--ink);padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none">Start the conversation →</a>
  </div>
</div>

</body>
</html>`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return Response.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  let record: ATRecord;
  let answers: BriefAnswers;

  if (typeof body.recordId === "string" && body.recordId.startsWith("rec")) {
    try {
      record = await atFetch(body.recordId, token);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      return Response.json({ error: "Report not found." }, { status: 404 });
    }
    try {
      answers = JSON.parse(record.fields[F.answers] as string) as BriefAnswers;
    } catch {
      return Response.json({ error: "Report answers are malformed." }, { status: 422 });
    }
  } else if (body.answers && typeof body.answers === "object") {
    answers = body.answers as BriefAnswers;
    try {
      record = await atCreate(answers, token);
    } catch (err) {
      console.error("Failed to create report:", err);
      return Response.json({ error: "Could not save your brief. Please try again." }, { status: 502 });
    }
  } else {
    return Response.json({ error: "Provide either recordId (string) or answers (object)." }, { status: 400 });
  }

  const refId = (record.fields[F.reportId] as string | undefined) ?? record.id;
  const html  = buildBriefHtml(answers, refId);

  // Update Airtable in the background — don't block the response.
  atUpdate(record.id, html, token).catch((err) =>
    console.error("Airtable update failed:", err),
  );

  return Response.json({ ok: true, html, recordId: record.id, refId }, { status: 201 });
}
