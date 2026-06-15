// Brand Intelligence Brief — Phase 2.3
// Fetches Foundation report + Lead from Airtable, calls Perplexity for strategy,
// fetches Unsplash mood board imagery, builds a full 3-page HTML brief,
// saves it to Airtable and returns it.

export const maxDuration = 60;

const BASE    = "https://api.airtable.com/v0/appv2sIRwDvNPjV7j";
const REPORTS = `${BASE}/tbl7hxUDQRJLjUpKQ`;
const LEADS   = `${BASE}/tbl5qLZO9mAN9LQ0P`;

const RF = {
  reportId:  "fldDIew0Hh6uWyy7Z",
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

// ── Airtable helpers ──────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

type StrategyDoc = {
  // Page 1 — Brand Strategy Snapshot
  businessSummary:          string;
  audienceOverview:         string;
  keyChallenge:             string;
  marketObservations:       string[];
  positioningStatement:     string;
  differentiators:          string[];
  strategicRecommendations: string[];
  // Page 2 — Creative Direction
  creativeTheme:     string;
  designPrinciples:  string[];
  photographyStyle:  string;
  artDirectionNotes: string;
  moodboardQuery:    string;
  // Page 3 — Execution Framework
  competitorProfiles:  Array<{ name: string; positioning: string }>;
  recommendedPackage:  string;
};

type Swatch = { name: string; hex: string; role: string };

type MoodImage = {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
};

// ── Colour palette generation ─────────────────────────────────────────────────

const PALETTES: Record<string, Swatch[]> = {
  luxury_minimal: [
    { name: "Obsidian",  hex: "#1A1A18", role: "Primary"    },
    { name: "Ivory",     hex: "#F7F4ED", role: "Background" },
    { name: "Warm Gold", hex: "#C9A96E", role: "Accent"     },
    { name: "Stone",     hex: "#8C8578", role: "Secondary"  },
    { name: "Marble",    hex: "#E8E4DC", role: "Surface"    },
    { name: "Dust",      hex: "#CAC4B8", role: "Muted"      },
  ],
  luxury: [
    { name: "Midnight",     hex: "#0D1117", role: "Primary"    },
    { name: "Champagne",    hex: "#E8D5A3", role: "Accent"     },
    { name: "Deep Burgundy",hex: "#6B1F2A", role: "Secondary"  },
    { name: "Ivory",        hex: "#F5F0E8", role: "Background" },
    { name: "Warm Grey",    hex: "#9A9490", role: "Muted"      },
    { name: "Bronze",       hex: "#A0714F", role: "Pop"        },
  ],
  minimal: [
    { name: "Near Black", hex: "#1C1C1A", role: "Primary"    },
    { name: "Paper",      hex: "#F9F8F4", role: "Background" },
    { name: "Cool Grey",  hex: "#BEBDBA", role: "Secondary"  },
    { name: "Warm White", hex: "#EEECE7", role: "Surface"    },
    { name: "Slate",      hex: "#636260", role: "Muted"      },
    { name: "Graphite",   hex: "#3A3A38", role: "Deep"       },
  ],
  sustainable: [
    { name: "Forest", hex: "#2D5A3D", role: "Primary"    },
    { name: "Sage",   hex: "#7B9E87", role: "Secondary"  },
    { name: "Clay",   hex: "#C4846A", role: "Accent"     },
    { name: "Linen",  hex: "#F2EDE4", role: "Background" },
    { name: "Moss",   hex: "#4A6741", role: "Deep"       },
    { name: "Sand",   hex: "#D8C9A8", role: "Muted"      },
  ],
  futuristic: [
    { name: "Void",        hex: "#0A0A12", role: "Primary"    },
    { name: "Electric",    hex: "#4A6EFF", role: "Accent"     },
    { name: "Silver",      hex: "#C2C2CC", role: "Secondary"  },
    { name: "Ghost",       hex: "#F0F0F5", role: "Background" },
    { name: "Deep Purple", hex: "#2D1B69", role: "Deep"       },
    { name: "Ice",         hex: "#D8E4F0", role: "Surface"    },
  ],
  heritage: [
    { name: "Tobacco",    hex: "#5C3D2E", role: "Primary"    },
    { name: "Aged Ivory", hex: "#F0E8D8", role: "Background" },
    { name: "Brass",      hex: "#B5862A", role: "Accent"     },
    { name: "Burgundy",   hex: "#7A2832", role: "Secondary"  },
    { name: "Linen",      hex: "#D8CFC0", role: "Surface"    },
    { name: "Umber",      hex: "#3D2B1F", role: "Deep"       },
  ],
  experimental: [
    { name: "Jet",          hex: "#0D0D0D", role: "Primary"    },
    { name: "Acid Lime",    hex: "#C8F400", role: "Accent"     },
    { name: "Concrete",     hex: "#9E9E9E", role: "Secondary"  },
    { name: "Off White",    hex: "#F5F5F0", role: "Background" },
    { name: "Electric Pink",hex: "#FF1F7A", role: "Pop"        },
    { name: "Ash",          hex: "#4A4A4A", role: "Deep"       },
  ],
  default: [
    { name: "Ink",     hex: "#1C2418", role: "Primary"    },
    { name: "Cream",   hex: "#F4F1E9", role: "Background" },
    { name: "Pine",    hex: "#3E7D5A", role: "Accent"     },
    { name: "Stone",   hex: "#847F71", role: "Secondary"  },
    { name: "Surface", hex: "#FBF9F3", role: "Surface"    },
    { name: "Muted",   hex: "#ADA897", role: "Muted"      },
  ],
};

function selectPalette(perceptions: string[], boldness: number): Swatch[] {
  const has = (p: string) => perceptions.includes(p);
  if (has("Luxury") && has("Minimal")) return PALETTES.luxury_minimal;
  if (has("Luxury"))                   return PALETTES.luxury;
  if (has("Experimental"))             return PALETTES.experimental;
  if (has("Futuristic"))               return PALETTES.futuristic;
  if (has("Sustainable"))              return PALETTES.sustainable;
  if (has("Heritage-driven"))          return PALETTES.heritage;
  if (has("Minimal") || boldness < 34) return PALETTES.minimal;
  return PALETTES.default;
}

function textColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#1C2418" : "#F4F1E9";
}

// ── Personality spectrum scores ───────────────────────────────────────────────

function scorePersonality(perceptions: string[], boldness: number) {
  let luxury = 50;
  let minimal = 50 + (50 - boldness) * 0.4;

  if (perceptions.includes("Luxury"))          { luxury += 35; }
  if (perceptions.includes("Heritage-driven")) { luxury += 20; }
  if (perceptions.includes("Minimal"))         { luxury += 10; minimal += 25; }
  if (perceptions.includes("Futuristic"))      { minimal += 15; }
  if (perceptions.includes("Sustainable"))     { luxury -= 15; }
  if (perceptions.includes("Experimental"))    { luxury -= 20; minimal -= 35; }

  return {
    luxuryScore:  Math.max(5, Math.min(95, Math.round(luxury))),
    minimalScore: Math.max(5, Math.min(95, Math.round(minimal))),
  };
}

// ── Unsplash mood board imagery ───────────────────────────────────────────────

async function fetchMoodImages(query: string, apiKey: string | null): Promise<MoodImage[]> {
  if (apiKey) {
    try {
      const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=6&orientation=landscape&content_filter=high`;
      const res = await fetch(url, { headers: { Authorization: `Client-ID ${apiKey}` } });
      if (res.ok) {
        const photos = (await res.json()) as Array<{
          urls: { regular: string };
          alt_description: string | null;
          user: { name: string; links: { html: string } };
        }>;
        return photos.map((p) => ({
          url:       `${p.urls.regular}&w=800&q=80`,
          alt:       p.alt_description ?? query,
          credit:    p.user.name,
          creditUrl: `${p.user.links.html}?utm_source=spazio_brief&utm_medium=referral`,
        }));
      }
    } catch (e) {
      console.warn("Unsplash fetch failed, using fallback:", e);
    }
  }

  // Fallback: Picsum Photos — deterministic seeds, no key required
  const word = query.split(" ")[0] || "brand";
  return Array.from({ length: 6 }, (_, i) => ({
    url:       `https://picsum.photos/seed/${encodeURIComponent(word + i)}/800/500`,
    alt:       `${query} reference ${i + 1}`,
    credit:    "Picsum Photos",
    creditUrl: "https://picsum.photos",
  }));
}

// ── Competitor logo helper ─────────────────────────────────────────────────────

function guessDomain(name: string): string {
  return name.toLowerCase().replace(/['"®™,\.]/g, "").replace(/\s+/g, "") + ".com";
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

// ── Perplexity ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior brand strategist and creative consultant at Spazio, a digital design agency. \
You produce research-backed brand strategy documents for founders, startups, and growing brands. \
Your role is that of a human expert conducting real market research and strategic analysis — not an AI automation tool. \
Write with confidence, precision, and authority. Avoid filler phrases like "it's important to note" or "leveraging synergies". \
Back every strategic claim with observable market reality. Use your web search results. \
Return only the structured JSON requested — no preamble, no markdown fences, no commentary.`;

function buildPrompt(
  lead: Record<string, unknown>,
  answers: Record<string, unknown>,
): { system: string; user: string } {
  const shaping        = (answers.shaping        ?? {}) as Record<string, string>;
  const direction      = (answers.direction      ?? {}) as Record<string, unknown>;
  const visualLanguage = (answers.visualLanguage ?? {}) as Record<string, unknown>;
  const output         = (answers.output         ?? {}) as Record<string, string>;
  const context        = (answers.context        ?? {}) as Record<string, unknown>;

  const clientName = String(lead[LF.name]    ?? "").trim() || "the client";
  const company    = String(lead[LF.company] ?? "").trim();
  const website    = String(lead[LF.website] ?? "").trim();
  const serviceInt = String(lead[LF.service] ?? "").trim();

  const perceptions = Array.isArray(direction.target_perception)
    ? (direction.target_perception as string[]).join(", ")
    : "";
  const emotion    = String(direction.emotional_outcome ?? "").trim();
  const metaphor   = String(direction.metaphor          ?? "").trim();
  const avoidList  = String(visualLanguage.avoid_list   ?? "").trim();
  const visualRefs = Array.isArray(visualLanguage.visual_references)
    ? (visualLanguage.visual_references as string[]).join(", ")
    : "";
  const materials  = Array.isArray(visualLanguage.materials)
    ? (visualLanguage.materials as string[]).join(", ")
    : "";
  const competitors = String(context.competitors ?? "").trim();
  const cultural    = Array.isArray(context.cultural_inspiration)
    ? (context.cultural_inspiration as string[]).join(", ")
    : "";

  const user = `CLIENT BRIEF — research this brand and produce a complete strategy document.

CLIENT:
- Name: ${clientName}${company ? ` / ${company}` : ""}${website ? ` — ${website}` : ""}
- Service: ${serviceInt || shaping.project_type || "Brand Identity"}
- Project type: ${shaping.project_type || "Brand Identity"}
- Industry / category: ${shaping.industry || "Not specified"}
- Goal: ${shaping.goal || "Not specified"}
- Desired perceptions: ${perceptions || "Not specified"}
- Emotional outcome: ${emotion || "Not specified"}
- Brand metaphor / personality: ${metaphor || "Not specified"}
- Visual references: ${visualRefs || "Not specified"}
- Material language: ${materials || "Not specified"}
- Visual avoidances: ${avoidList || "None stated"}
- Creative output: ${output.direction_count || 3} directions, ${output.boldness_level || "Balanced"} boldness${competitors ? `\n- Named competitors/benchmarks: ${competitors}` : ""}${cultural ? `\n- Cultural touchstones: ${cultural}` : ""}

Use web search to research this category, market context, and relevant competitors. Return this JSON object exactly:

{
  "businessSummary": "2–3 sentences: what this client does, their market position, relevant context",
  "audienceOverview": "2–3 sentences: primary audience — who they are, what they value, what they respond to",
  "keyChallenge": "1–2 sentences: the central brand challenge or opportunity this project must resolve",
  "marketObservations": [
    "A specific, research-backed market observation",
    "A competitive gap or tension in the category worth exploiting",
    "An audience behaviour or expectation shift relevant to this project",
    "A trend or emerging signal that affects the brand direction"
  ],
  "positioningStatement": "A single declarative positioning statement — specific, differentiated, ownable",
  "differentiators": ["Short, concrete differentiator", "Second differentiator", "Third differentiator"],
  "strategicRecommendations": [
    "Actionable recommendation tied to research",
    "Second recommendation",
    "Third recommendation",
    "Fourth recommendation"
  ],
  "creativeTheme": "An evocative 2–4 word creative theme title for the direction (e.g. 'Quiet Precision', 'Rooted Authority')",
  "designPrinciples": [
    "A concrete design principle that should guide all creative decisions",
    "Second principle",
    "Third principle",
    "Fourth principle"
  ],
  "photographyStyle": "2 sentences describing the photography direction: lighting, subject matter, mood, composition approach",
  "artDirectionNotes": "2–3 specific art direction notes for the creative team — what to do and what to avoid",
  "moodboardQuery": "The best 3–5 word Unsplash search query to find on-brand reference images (e.g. 'minimal luxury packaging design')",
  "competitorProfiles": [
    { "name": "Real competitor brand name from this category", "positioning": "How they position, e.g. 'Premium / Minimal'" },
    { "name": "Second competitor", "positioning": "Their positioning" },
    { "name": "Third competitor", "positioning": "Their positioning" }
  ],
  "recommendedPackage": "The most appropriate Spazio service tier, e.g. 'Brand Foundation', 'Full Identity System', or 'Brand + Web'"
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
        { role: "user",   content: user   },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const raw  = data.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/m, "").trim();
  return JSON.parse(cleaned) as StrategyDoc;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dotList(items: string[]): string {
  return `<ul class="dot-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function numList(items: string[]): string {
  return `<ul class="num-list">${items.map((i, n) => `<li><span class="num">${String(n + 1).padStart(2, "0")}</span><span>${esc(i)}</span></li>`).join("")}</ul>`;
}

function spectrumBar(label1: string, label2: string, score: number, id: string): string {
  return `
<div class="spectrum">
  <span class="spectrum-label">${esc(label1)}</span>
  <div class="spectrum-track" aria-label="${id} position: ${score}/100">
    <div class="spectrum-fill" style="width:${score}%"></div>
    <div class="spectrum-thumb" style="left:${score}%"></div>
  </div>
  <span class="spectrum-label spectrum-label--right">${esc(label2)}</span>
</div>`;
}

function getDeliverables(projectType: string): Array<[string, string]> {
  const base: Array<[string, string]> = [
    ["Brand Strategy Document", "Positioning, direction, rationale"],
    ["Logo System",             "Primary mark, variations, clear space"],
    ["Colour Palette",          "Full palette with hex codes + usage"],
    ["Typography System",       "Font pairing, scale, hierarchy"],
    ["Brand Guidelines",        "Rules, do/don't examples, assets"],
  ];
  if (projectType === "Website") {
    base.push(["Website Design", "Figma mockups, all pages + mobile"]);
    base.push(["Component Library", "Design tokens + UI kit"]);
  }
  if (projectType === "Digital Product") {
    base.push(["UI Kit",           "Component library + design system"]);
    base.push(["Interaction Guide","Motion principles + micro-interactions"]);
  }
  if (projectType === "Packaging System") {
    base.push(["Packaging Templates", "All SKU formats + print specs"]);
    base.push(["Retail Mockups",      "3D renders for presentation"]);
  }
  return base;
}

// ── Full HTML brief builder ───────────────────────────────────────────────────

function buildHTML(
  strategy: StrategyDoc,
  lead: Record<string, unknown>,
  answers: Record<string, unknown>,
  palette: Swatch[],
  images: MoodImage[],
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
  const year        = new Date().getFullYear();

  const projectType = esc(shaping.project_type || "Brand Identity");
  const industry    = esc(shaping.industry || "—");
  const goal        = esc(shaping.goal || "");
  const boldnessNum = Number(typeof output.boldness_level === "number" ? output.boldness_level : 50);
  const boldness    = esc(String(output.boldness_level || "Balanced"));
  const dirCount    = esc(String(output.direction_count || 3));

  const perceptions = Array.isArray(direction.target_perception)
    ? (direction.target_perception as string[])
    : [];
  const visualRefs = Array.isArray(visLang.visual_references)
    ? (visLang.visual_references as string[])
    : [];
  const materials = Array.isArray(visLang.materials)
    ? (visLang.materials as string[])
    : [];
  const cultural = Array.isArray(context.cultural_inspiration)
    ? (context.cultural_inspiration as string[])
    : [];

  const { luxuryScore, minimalScore } = scorePersonality(perceptions, boldnessNum);
  const deliverables = getDeliverables(shaping.project_type || "Brand Identity");

  const competitors = (strategy.competitorProfiles ?? []).slice(0, 4);
  const principles  = (strategy.designPrinciples ?? []).slice(0, 5);

  // Moodboard HTML — 6-image grid (1 wide + 2 normal, then 2 normal + 1 wide)
  const moodboardHtml = images.length > 0
    ? `<div class="moodboard">
      ${images.slice(0, 6).map((img, i) => `<div class="mood-cell ${i === 0 || i === 4 ? "mood-wide" : ""}">
        <img src="${esc(img.url)}" alt="${esc(img.alt)}" loading="lazy">
      </div>`).join("")}
    </div>
    <p class="photo-credit">Photography: <a href="${esc(images[0]?.creditUrl ?? "#")}" target="_blank" rel="noopener">${esc(images[0]?.credit ?? "")}</a> via Unsplash</p>`
    : `<div class="moodboard-placeholder"><p>Mood board images coming soon</p></div>`;

  // Competitor cards HTML
  const competitorHtml = competitors.length > 0
    ? `<div class="comp-grid">
      ${competitors.map((c) => {
        const domain = guessDomain(c.name);
        const init   = initials(c.name);
        return `<div class="comp-card">
          <div class="comp-logo-wrap" id="logo-${init}">
            <img src="https://logo.clearbit.com/${esc(domain)}" alt="${esc(c.name)}"
              onerror="this.style.display='none';document.getElementById('fb-${init}').style.display='flex'">
            <div class="comp-initials" id="fb-${init}" style="display:none">${esc(init)}</div>
          </div>
          <div class="comp-info">
            <p class="comp-name">${esc(c.name)}</p>
            <p class="comp-position">${esc(c.positioning)}</p>
          </div>
        </div>`;
      }).join("")}
    </div>`
    : "";

  // Palette swatches
  const paletteHtml = palette.map((s) => {
    const fg = textColor(s.hex);
    return `<div class="swatch" style="background:${s.hex};color:${fg}" title="${s.role}">
      <span class="swatch-name">${esc(s.name)}</span>
      <span class="swatch-hex">${s.hex}</span>
    </div>`;
  }).join("");

  // Deliverables table rows
  const deliverableRows = deliverables.map(([item, desc]) =>
    `<tr><td>${esc(item)}</td><td>${esc(desc)}</td></tr>`
  ).join("");

  // Chip row helper
  const chips = (arr: string[]) => arr.length
    ? `<div class="chip-row">${arr.map((v) => `<span class="chip-sm">${esc(v)}</span>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spazio Brand Intelligence Report™ — ${displayName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&display=swap" rel="stylesheet">
<style>
:root {
  --lime:        #ADE514;
  --lime-dark:   #8AB810;
  --lime-soft:   #F0FAD0;
  --ink:         #1C2418;
  --ink-2:       #3A4236;
  --ink-3:       #7A8574;
  --ink-4:       #A8B0A4;
  --bg:          #F4F1E9;
  --bg-2:        #EBE7DC;
  --surface:     #FAFAF5;
  --line:        #DDD9CF;
  --line-2:      #CEC9BE;
  --sans:        "DM Sans", system-ui, sans-serif;
  --serif:       "Fraunces", Georgia, serif;
  --radius:      6px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }
img { max-width: 100%; display: block; }

/* ── Shell ── */
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 44px;
}

.page-rule {
  border: none;
  border-top: 1px solid var(--line);
  margin: 72px 0;
  page-break-after: always;
}

@media print {
  .page-rule { margin: 0; border: none; }
  .page { padding: 0; }
  body { font-size: 13px; }
}

/* ── Cover ── */
.cover {
  display: flex;
  flex-direction: column;
  min-height: 380px;
  padding: 52px 0 44px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 60px;
}

.cover-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 44px;
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.wordmark-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--lime);
  flex-shrink: 0;
}

.ref-tag {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.cover-eyebrow {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lime-dark);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cover-eyebrow::before {
  content: "";
  width: 18px;
  height: 1.5px;
  background: var(--lime);
}

.cover-title {
  font-family: var(--serif);
  font-weight: 300;
  font-style: italic;
  font-size: clamp(40px, 6vw, 62px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 8px;
}

.cover-client {
  font-family: var(--sans);
  font-size: 20px;
  font-weight: 500;
  color: var(--ink-2);
  letter-spacing: -0.015em;
  margin-bottom: 36px;
}

.cover-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill {
  display: inline-block;
  padding: 5px 13px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  background: var(--lime-soft);
  color: var(--ink-2);
  border: 1px solid color-mix(in srgb, var(--lime) 35%, transparent);
}

.cover-date {
  margin-top: auto;
  padding-top: 28px;
  font-size: 12px;
  color: var(--ink-4);
  letter-spacing: 0.04em;
}

/* ── Section chrome ── */
.section-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--lime-dark);
  margin-bottom: 24px;
}
.section-eyebrow::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}

.page-title {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin-bottom: 44px;
  color: var(--ink);
}
.page-title em { color: var(--ink-3); }

.section { margin-bottom: 52px; }

/* ── Strategy grid ── */
.sgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
.scell {
  padding: 22px 26px;
  border: 1px solid var(--line);
  margin: -1px 0 0 -1px;
}
.scell.full { grid-column: span 2; }
.scell:first-child { margin-top: 0; }

.cell-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-bottom: 8px;
}
.cell-value {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink);
}
.cell-value.large {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(19px, 2.4vw, 25px);
  line-height: 1.3;
  letter-spacing: -0.015em;
  color: var(--ink);
}

/* ── Lists ── */
.dot-list {
  list-style: none;
  display: grid;
  gap: 12px;
}
.dot-list li {
  padding-left: 16px;
  position: relative;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--ink-2);
}
.dot-list li::before {
  content: "";
  position: absolute;
  left: 0; top: 9px;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--lime);
}

.num-list {
  list-style: none;
  display: grid;
  gap: 14px;
}
.num-list li {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 10px;
  align-items: start;
}
.num-list .num {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--lime-dark);
  padding-top: 3px;
  font-variant-numeric: tabular-nums;
}
.num-list li > span:last-child {
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--ink-2);
}

/* ── Positioning block ── */
.positioning-block {
  border-left: 3px solid var(--lime);
  padding: 20px 24px;
  background: var(--surface);
}

/* ── Differentiators ── */
.diff-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.diff-tag {
  padding: 9px 16px;
  border: 1px solid var(--line-2);
  border-radius: var(--radius);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
}

/* ── Design principles ── */
.principles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.principle-card {
  padding: 18px 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  border-top: 2px solid var(--lime);
}
.principle-num {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--lime-dark);
  margin-bottom: 8px;
}
.principle-text {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-2);
}

/* ── Personality spectrum ── */
.spectrum-pair { display: grid; gap: 18px; }
.spectrum {
  display: grid;
  grid-template-columns: 90px 1fr 90px;
  align-items: center;
  gap: 14px;
}
.spectrum-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
}
.spectrum-label--right { text-align: right; }
.spectrum-track {
  position: relative;
  height: 4px;
  background: var(--line-2);
  border-radius: 4px;
}
.spectrum-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: var(--lime);
  border-radius: 4px;
}
.spectrum-thumb {
  position: absolute;
  top: 50%;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--ink);
  border: 2.5px solid var(--bg);
  box-shadow: 0 0 0 2px var(--ink);
  transform: translate(-50%, -50%);
}

/* ── Mood board ── */
.moodboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 200px;
  gap: 6px;
  border-radius: var(--radius);
  overflow: hidden;
}
.mood-cell { overflow: hidden; background: var(--bg-2); }
.mood-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.mood-cell img:hover { transform: scale(1.03); }
.mood-wide { grid-column: span 2; }

.photo-credit {
  font-size: 11px;
  color: var(--ink-4);
  margin-top: 10px;
  letter-spacing: 0.02em;
}
.photo-credit a { color: var(--ink-3); text-decoration: underline; }

/* ── Photography & art direction ── */
.direction-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

/* ── Colour palette ── */
.palette-strip {
  display: flex;
  border-radius: var(--radius);
  overflow: hidden;
  height: 110px;
  gap: 2px;
}
.swatch {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 10px 12px;
}
.swatch-name {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
}
.swatch-role {
  font-size: 10px;
  opacity: 0.65;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 1px;
}
.swatch-hex {
  font-size: 10px;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}

/* ── Competitors ── */
.comp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.comp-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.comp-logo-wrap {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--bg-2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.comp-logo-wrap img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
.comp-initials {
  font-weight: 700;
  font-size: 16px;
  color: var(--ink-3);
  letter-spacing: -0.02em;
}
.comp-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.comp-position {
  font-size: 12px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

/* ── Deliverables table ── */
.del-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.del-table th {
  padding: 10px 16px;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  background: var(--bg-2);
  border: 1px solid var(--line);
}
.del-table td {
  padding: 12px 16px;
  border: 1px solid var(--line);
  vertical-align: top;
}
.del-table td:first-child {
  font-weight: 500;
  color: var(--ink);
}
.del-table td:last-child { color: var(--ink-3); }

/* ── Phase roadmap ── */
.roadmap {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: start;
  gap: 0;
}
.phase {
  padding: 22px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}
.phase-arrow {
  display: flex;
  align-items: center;
  padding: 0 10px;
  margin-top: 22px;
  color: var(--line-2);
  font-size: 20px;
}
.phase-num {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lime-dark);
  margin-bottom: 8px;
}
.phase-title {
  font-family: var(--serif);
  font-style: italic;
  font-size: 18px;
  font-weight: 300;
  color: var(--ink);
  margin-bottom: 6px;
}
.phase-items {
  list-style: none;
  display: grid;
  gap: 4px;
  margin-top: 10px;
}
.phase-items li {
  font-size: 12.5px;
  color: var(--ink-3);
  padding-left: 12px;
  position: relative;
}
.phase-items li::before {
  content: "·";
  position: absolute;
  left: 0;
  color: var(--lime);
}

/* ── CTA ── */
.cta-box {
  background: var(--ink);
  color: #F4F1E9;
  border-radius: var(--radius);
  padding: 32px 36px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 24px;
}
.cta-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--lime);
  margin-bottom: 8px;
}
.cta-title {
  font-family: var(--serif);
  font-style: italic;
  font-weight: 300;
  font-size: clamp(20px, 2.5vw, 26px);
  line-height: 1.2;
  letter-spacing: -0.015em;
}
.cta-package {
  background: var(--lime);
  color: var(--ink);
  font-weight: 600;
  font-size: 14px;
  padding: 12px 22px;
  border-radius: 100px;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

/* ── Chips ── */
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-sm {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  background: var(--lime-soft);
  color: var(--ink-2);
  border: 1px solid color-mix(in srgb, var(--lime) 30%, transparent);
}

/* ── Brief data table ── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table td {
  padding: 11px 15px;
  border: 1px solid var(--line);
  vertical-align: top;
}
.data-table td:first-child {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-4);
  width: 140px;
  background: var(--bg-2);
}

/* ── Footer ── */
.brief-footer {
  border-top: 1px solid var(--line);
  padding: 22px 0 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: var(--ink-4);
  letter-spacing: 0.04em;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--ink-3);
}
.footer-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--lime);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .page { padding: 0 20px; }
  .sgrid, .direction-pair { grid-template-columns: 1fr; }
  .scell.full { grid-column: 1; }
  .moodboard { grid-template-columns: 1fr 1fr; }
  .mood-wide { grid-column: span 2; }
  .roadmap { grid-template-columns: 1fr; }
  .phase-arrow { display: none; }
  .cta-box { grid-template-columns: 1fr; }
  .spectrum { grid-template-columns: 70px 1fr 70px; }
}
</style>
</head>
<body>
<div class="page">

<!-- ══ COVER ══════════════════════════════════════════════════════ -->

<div class="cover">
  <div class="cover-top">
    <div class="wordmark">
      <span class="wordmark-dot"></span>
      Spazio
    </div>
    <span class="ref-tag">${esc(reportRef)}</span>
  </div>
  <p class="cover-eyebrow">Brand Intelligence Report™</p>
  <h1 class="cover-title">Built for<br>${displayName}.</h1>
  <p class="cover-client">${esc(strategy.creativeTheme || projectType)}</p>
  <div class="cover-pills">
    <span class="pill">${projectType}</span>
    ${industry !== "—" ? `<span class="pill">${industry}</span>` : ""}
    <span class="pill">${dirCount} directions · ${boldness}</span>
    ${perceptions.slice(0, 2).map((p) => `<span class="pill">${esc(p)}</span>`).join("")}
  </div>
  <p class="cover-date">Prepared ${today} &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; Spazio Design Studio</p>
</div>


<!-- ══ PAGE 1 — BRAND STRATEGY SNAPSHOT ══════════════════════════ -->

<div class="section-eyebrow">01 &nbsp; Brand Strategy Snapshot</div>
<h2 class="page-title">Where you stand.<br><em>Where you could go.</em></h2>

<div class="section">
  <div class="sgrid">
    <div class="scell full">
      <p class="cell-label">Business Summary</p>
      <p class="cell-value">${esc(strategy.businessSummary)}</p>
    </div>
    <div class="scell">
      <p class="cell-label">Audience Overview</p>
      <p class="cell-value">${esc(strategy.audienceOverview)}</p>
    </div>
    <div class="scell">
      <p class="cell-label">Key Challenge / Opportunity</p>
      <p class="cell-value">${esc(strategy.keyChallenge)}</p>
    </div>
  </div>
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Market Observations</p>
  ${dotList(strategy.marketObservations ?? [])}
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:12px;">Brand Positioning</p>
  <div class="positioning-block">
    <p class="cell-value large">${esc(strategy.positioningStatement)}</p>
  </div>
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:12px;">Differentiators</p>
  <div class="diff-row">
    ${(strategy.differentiators ?? []).map((d) => `<span class="diff-tag">${esc(d)}</span>`).join("")}
  </div>
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Strategic Recommendations</p>
  ${numList(strategy.strategicRecommendations ?? [])}
</div>

<hr class="page-rule">


<!-- ══ PAGE 2 — CREATIVE DIRECTION ═══════════════════════════════ -->

<div class="section-eyebrow">02 &nbsp; Creative Direction</div>
<h2 class="page-title">${esc(strategy.creativeTheme || "The visual direction")}.<br><em>How it should feel.</em></h2>

${principles.length > 0 ? `
<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Design Principles</p>
  <div class="principles-grid">
    ${principles.map((p, i) => `
    <div class="principle-card">
      <p class="principle-num">${String(i + 1).padStart(2, "0")}</p>
      <p class="principle-text">${esc(p)}</p>
    </div>`).join("")}
  </div>
</div>` : ""}

<div class="section">
  <p class="cell-label" style="margin-bottom:18px;">Brand Personality</p>
  <div class="spectrum-pair">
    ${spectrumBar("Luxury", "Accessible", luxuryScore, "luxury-accessible")}
    ${spectrumBar("Minimal", "Expressive", 100 - minimalScore, "minimal-expressive")}
  </div>
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Mood Board</p>
  ${moodboardHtml}
</div>

<div class="section">
  <div class="direction-pair">
    <div class="scell">
      <p class="cell-label">Photography Style</p>
      <p class="cell-value">${esc(strategy.photographyStyle || "")}</p>
    </div>
    <div class="scell">
      <p class="cell-label">Art Direction Notes</p>
      <p class="cell-value">${esc(strategy.artDirectionNotes || "")}</p>
    </div>
  </div>
</div>

${perceptions.length > 0 || visualRefs.length > 0 || materials.length > 0 ? `
<div class="section">
  ${perceptions.length > 0 ? `
  <p class="cell-label" style="margin-bottom:10px;">Desired Perceptions</p>
  ${chips(perceptions)}` : ""}
  ${visualRefs.length > 0 ? `
  <p class="cell-label" style="margin-bottom:10px;margin-top:20px;">Visual References</p>
  ${chips(visualRefs)}` : ""}
  ${materials.length > 0 ? `
  <p class="cell-label" style="margin-bottom:10px;margin-top:20px;">Material Language</p>
  ${chips(materials)}` : ""}
</div>` : ""}

<hr class="page-rule">


<!-- ══ PAGE 3 — EXECUTION FRAMEWORK ══════════════════════════════ -->

<div class="section-eyebrow">03 &nbsp; Execution Framework</div>
<h2 class="page-title">What gets built.<br><em>How it comes to life.</em></h2>

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Colour Palette</p>
  <div class="palette-strip">${paletteHtml}</div>
  <p style="font-size:12px;color:var(--ink-4);margin-top:10px;">Directional palette — refined during design phase</p>
</div>

${competitorHtml ? `
<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Competitive Landscape</p>
  ${competitorHtml}
</div>` : ""}

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Deliverables</p>
  <table class="del-table">
    <thead>
      <tr><th>Deliverable</th><th>Description</th></tr>
    </thead>
    <tbody>${deliverableRows}</tbody>
  </table>
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Phase Roadmap</p>
  <div class="roadmap">
    <div class="phase">
      <p class="phase-num">Phase 01</p>
      <p class="phase-title">Foundation</p>
      <ul class="phase-items">
        <li>Brief alignment</li>
        <li>Strategy review</li>
        <li>Direction approval</li>
      </ul>
    </div>
    <div class="phase-arrow">→</div>
    <div class="phase">
      <p class="phase-num">Phase 02</p>
      <p class="phase-title">Design</p>
      <ul class="phase-items">
        <li>${dirCount} creative directions</li>
        <li>Refinement rounds</li>
        <li>System build-out</li>
      </ul>
    </div>
    <div class="phase-arrow">→</div>
    <div class="phase">
      <p class="phase-num">Phase 03</p>
      <p class="phase-title">Launch</p>
      <ul class="phase-items">
        <li>Final files + formats</li>
        <li>Brand guidelines</li>
        <li>Handover session</li>
      </ul>
    </div>
  </div>
</div>

<div class="section">
  <div class="cta-box">
    <div>
      <p class="cta-label">Recommended for ${displayName}</p>
      <p class="cta-title">${esc(strategy.recommendedPackage || "Brand Foundation Package")}</p>
    </div>
    <span class="cta-package">Get started →</span>
  </div>
</div>

<div class="section">
  <p class="cell-label" style="margin-bottom:14px;">Brief on Record</p>
  <table class="data-table">
    <tbody>
      <tr><td>Client</td><td>${displayName}</td></tr>
      <tr><td>Project</td><td>${projectType}</td></tr>
      <tr><td>Industry</td><td>${industry}</td></tr>
      <tr><td>Goal</td><td>${goal || "—"}</td></tr>
      <tr><td>Output</td><td>${dirCount} directions · ${boldness}</td></tr>
      ${cultural.length > 0 ? `<tr><td>Culture</td><td>${cultural.map(esc).join(", ")}</td></tr>` : ""}
    </tbody>
  </table>
</div>

<!-- Footer -->
<div class="brief-footer">
  <div class="footer-brand">
    <span class="footer-dot"></span>
    © ${year} Spazio — Confidential client document
  </div>
  <span>${esc(reportRef)} &nbsp;·&nbsp; ${today}</span>
</div>

</div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const airtableToken  = process.env.AIRTABLE_TOKEN;
  const perplexityKey  = process.env.PERPLEXITY_API_KEY;
  const unsplashKey    = process.env.UNSPLASH_ACCESS_KEY ?? null;

  if (!airtableToken) return Response.json({ error: "AIRTABLE_TOKEN not configured." }, { status: 500 });
  if (!perplexityKey) return Response.json({ error: "PERPLEXITY_API_KEY not configured." }, { status: 500 });

  let reportId: string;
  try {
    const body = (await request.json()) as { reportId?: string };
    reportId = body.reportId ?? "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!reportId) return Response.json({ error: "reportId is required." }, { status: 400 });

  // 1. Fetch report record
  let report: { fields: Record<string, unknown> };
  try {
    report = await atGet(`${REPORTS}/${reportId}`, airtableToken);
  } catch (err) {
    console.error("Failed to fetch report:", err);
    return Response.json({ error: "Report not found." }, { status: 404 });
  }

  const reportFields = report.fields;
  const reportRef    = String(reportFields[RF.reportId] || reportId).slice(0, 16).toUpperCase();

  // 2. Linked lead
  const linkedLeads = reportFields[RF.lead];
  const leadId      = Array.isArray(linkedLeads) ? String(linkedLeads[0]) : null;
  if (!leadId) return Response.json({ error: "Report has no linked lead." }, { status: 422 });

  // 3. Fetch lead
  let leadRecord: { fields: Record<string, unknown> };
  try {
    leadRecord = await atGet(`${LEADS}/${leadId}`, airtableToken);
  } catch (err) {
    console.error("Failed to fetch lead:", err);
    return Response.json({ error: "Could not retrieve lead data." }, { status: 502 });
  }
  const lead = leadRecord.fields;

  // 4. Parse answers
  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(String(reportFields[RF.answers] ?? "{}")) as Record<string, unknown>;
  } catch {
    console.warn("Could not parse answers JSON");
  }

  // 5. Mark Processing
  await atPatch(REPORTS, reportId, { [RF.status]: "Processing" }, airtableToken).catch(() => {});

  // 6. Call Perplexity for full strategy + creative direction
  let strategy: StrategyDoc;
  try {
    strategy = await callPerplexity(buildPrompt(lead, answers), perplexityKey);
  } catch (err) {
    console.error("Perplexity failed:", err);
    await atPatch(REPORTS, reportId, { [RF.status]: "Draft" }, airtableToken).catch(() => {});
    return Response.json({ error: "Strategy generation failed. Please try again." }, { status: 502 });
  }

  // 7. Derive palette from questionnaire
  const shaping      = (answers.shaping    ?? {}) as Record<string, string>;
  const directionAns = (answers.direction  ?? {}) as Record<string, unknown>;
  const outputAns    = (answers.output     ?? {}) as Record<string, string>;
  const perceptions  = Array.isArray(directionAns.target_perception)
    ? (directionAns.target_perception as string[])
    : [];
  const boldnessNum  = Number(outputAns.boldness_level ?? 50);
  const palette      = selectPalette(perceptions, boldnessNum);

  // 8. Fetch mood board images
  const imgQuery = strategy.moodboardQuery
    || `${shaping.industry || ""} ${perceptions[0] || "brand"} ${shaping.project_type || "design"}`.trim();
  const images   = await fetchMoodImages(imgQuery, unsplashKey);

  // 9. Build full HTML brief
  const html = buildHTML(strategy, lead, answers, palette, images, reportRef);

  // 10. Save to Airtable + Complete
  await atPatch(REPORTS, reportId, { [RF.briefHtml]: html, [RF.status]: "Complete" }, airtableToken)
    .catch((err) => console.error("Failed to save brief:", err));

  return Response.json({ ok: true, html }, { status: 200 });
}
