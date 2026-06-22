// lib/deck-render.ts
// Pure renderer: brand-audit JSON -> self-contained HTML (inline styles only,
// no <script>, no external CSS — it renders inside Airtable's preview + email).
// Every slide's `visual` is DRAWN (inline SVG / CSS) from `visual.data`, switched
// on `visual.type`. Kept separate from the route so it can be unit-tested.
//
// Visual data shapes (must match SLIDE_SCHEMA in app/api/generate-deck/route.ts):
//   chart       { labels:[], values:[], unit:"" }
//   table       { columns:[], rows:[[],[]] }
//   scorecard   { items:[{ label, score, max }] }
//   palette     { swatches:[{ name, hex }] }
//   positioning { x_axis, y_axis, points:[{ label, x:0-100, y:0-100 }] }   (also "matrix")
//   roadmap     { phases:[{ name, items:[] }] }
//   diagram     { steps:[] }                                               (also "framework")

const INK = "#17160F";
const SURFACE = "#FAF8F2";
const GREEN = "#2C5F2D";
const LIME = "#97BC62";
const MUTED = "#847F71";
const LINE = "#DFD9C9";

export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function safeHex(v: unknown): string {
  const h = String(v ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(h) ? h : "#E4DFD1";
}

/* ---------------- visual renderers ---------------- */

function chart(data: any): string {
  const labels: string[] = Array.isArray(data?.labels) ? data.labels : [];
  const values: number[] = Array.isArray(data?.values) ? data.values.map(num) : [];
  if (!values.length) return "";
  const unit = String(data?.unit ?? "");
  const W = 680, H = 280, padX = 16, padTop = 30, padBottom = 56;
  const max = Math.max(...values, 1);
  const slot = (W - padX * 2) / values.length;
  const bw = Math.min(slot * 0.6, 90);
  const bars = values.map((v, i) => {
    const bh = Math.max(2, (v / max) * (H - padTop - padBottom));
    const x = padX + i * slot + (slot - bw) / 2;
    const y = H - padBottom - bh;
    const label = esc(labels[i] ?? "");
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${GREEN}"></rect>` +
      `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">${esc(v)}${esc(unit)}</text>` +
      `<text x="${(x + bw / 2).toFixed(1)}" y="${(H - padBottom + 20).toFixed(1)}" text-anchor="middle" font-size="11" fill="${MUTED}">${label}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:680px;display:block;">` +
    `<line x1="${padX}" y1="${H - padBottom}" x2="${W - padX}" y2="${H - padBottom}" stroke="${LINE}" stroke-width="1.5"></line>${bars}</svg>`;
}

function table(data: any): string {
  const columns: string[] = Array.isArray(data?.columns) ? data.columns : [];
  const rows: any[][] = Array.isArray(data?.rows) ? data.rows : [];
  if (!columns.length && !rows.length) return "";
  const head = columns.length
    ? `<thead><tr>${columns.map((c) => `<th style="text-align:left;padding:10px 14px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};border-bottom:2px solid ${LINE};">${esc(c)}</th>`).join("")}</tr></thead>`
    : "";
  const body = rows.map((r, ri) => `<tr style="background:${ri % 2 ? "#FFFFFF" : "transparent"};">${(Array.isArray(r) ? r : [r]).map((cell) => `<td style="padding:10px 14px;font-size:13.5px;color:#514E44;border-bottom:1px solid ${LINE};vertical-align:top;">${esc(cell)}</td>`).join("")}</tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;border:1px solid ${LINE};border-radius:8px;overflow:hidden;">${head}<tbody>${body}</tbody></table>`;
}

function scorecard(data: any): string {
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) return "";
  return `<div style="display:grid;gap:14px;">` + items.map((it) => {
    const max = num(it?.max) || 100;
    const score = Math.max(0, Math.min(num(it?.score), max));
    const pct = Math.round((score / max) * 100);
    return `<div>` +
      `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:0 0 6px;"><span style="font-size:13.5px;color:${INK};font-weight:600;">${esc(it?.label)}</span><span style="font-size:12px;color:${MUTED};">${esc(score)} / ${esc(max)}</span></div>` +
      `<div style="height:12px;border-radius:6px;background:#ECE8DD;overflow:hidden;"><div style="height:100%;width:${pct}%;border-radius:6px;background:linear-gradient(90deg,${GREEN},${LIME});"></div></div>` +
    `</div>`;
  }).join("") + `</div>`;
}

function palette(data: any): string {
  const swatches: any[] = Array.isArray(data?.swatches) ? data.swatches : [];
  if (!swatches.length) return "";
  return `<div style="display:flex;flex-wrap:wrap;gap:14px;">` + swatches.map((s) => {
    const hex = safeHex(s?.hex);
    return `<div style="flex:1 1 110px;min-width:110px;">` +
      `<div style="height:84px;border-radius:8px;background:${hex};border:1px solid rgba(0,0,0,.08);"></div>` +
      `<p style="margin:8px 0 0;font-size:13px;font-weight:600;color:${INK};">${esc(s?.name)}</p>` +
      `<p style="margin:2px 0 0;font-size:11px;font-family:monospace;color:${MUTED};">${esc(hex)}</p>` +
    `</div>`;
  }).join("") + `</div>`;
}

function quadrant(data: any): string {
  const points: any[] = Array.isArray(data?.points) ? data.points : [];
  if (!points.length) return "";
  const W = 460, H = 460, pad = 54;
  const innerW = W - pad * 2, innerH = H - pad * 2;
  const px = (x: number) => pad + (Math.max(0, Math.min(num(x), 100)) / 100) * innerW;
  const py = (y: number) => H - pad - (Math.max(0, Math.min(num(y), 100)) / 100) * innerH;
  const dots = points.map((p) => {
    const cx = px(p?.x), cy = py(p?.y);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7" fill="${GREEN}"></circle>` +
      `<text x="${(cx + 11).toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="12" fill="${INK}" font-weight="600">${esc(p?.label)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:460px;display:block;">` +
    `<rect x="${pad}" y="${pad}" width="${innerW}" height="${innerH}" fill="#FFFFFF" stroke="${LINE}" stroke-width="1.5"></rect>` +
    `<line x1="${pad + innerW / 2}" y1="${pad}" x2="${pad + innerW / 2}" y2="${H - pad}" stroke="${LINE}" stroke-dasharray="4 4"></line>` +
    `<line x1="${pad}" y1="${pad + innerH / 2}" x2="${W - pad}" y2="${pad + innerH / 2}" stroke="${LINE}" stroke-dasharray="4 4"></line>` +
    `<text x="${W / 2}" y="${H - 16}" text-anchor="middle" font-size="12" font-weight="600" fill="${MUTED}">${esc(data?.x_axis)}</text>` +
    `<text x="18" y="${H / 2}" text-anchor="middle" font-size="12" font-weight="600" fill="${MUTED}" transform="rotate(-90 18 ${H / 2})">${esc(data?.y_axis)}</text>` +
    `${dots}</svg>`;
}

function roadmap(data: any): string {
  const phases: any[] = Array.isArray(data?.phases) ? data.phases : [];
  if (!phases.length) return "";
  return `<div style="display:flex;gap:0;flex-wrap:wrap;align-items:stretch;">` + phases.map((ph, i) => {
    const items: string[] = Array.isArray(ph?.items) ? ph.items : [];
    return `<div style="flex:1 1 160px;min-width:160px;position:relative;padding:0 8px;">` +
      `<div style="height:6px;border-radius:3px;background:${i === 0 ? GREEN : LIME};margin:0 0 12px;"></div>` +
      `<p style="margin:0 0 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${GREEN};font-weight:700;">Phase ${i + 1}</p>` +
      `<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${INK};">${esc(ph?.name)}</p>` +
      `<ul style="margin:0;padding:0 0 0 16px;">${items.map((it) => `<li style="font-size:13px;color:#514E44;margin:0 0 4px;line-height:1.45;">${esc(it)}</li>`).join("")}</ul>` +
    `</div>`;
  }).join("") + `</div>`;
}

function diagram(data: any): string {
  const steps: string[] = Array.isArray(data?.steps) ? data.steps : [];
  if (!steps.length) return "";
  return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">` + steps.map((st, i) => {
    const box = `<div style="flex:0 1 auto;padding:12px 16px;background:#FFFFFF;border:1px solid ${LINE};border-radius:8px;font-size:13.5px;color:${INK};font-weight:600;">${esc(st)}</div>`;
    const arrow = i < steps.length - 1 ? `<span style="color:${LIME};font-size:18px;">&#8594;</span>` : "";
    return box + arrow;
  }).join("") + `</div>`;
}

// Route a slide's visual to the right drawer. Returns "" if nothing renderable.
function renderVisual(visual: any): string {
  if (!visual) return "";
  const t = String(visual.type ?? "").toLowerCase();
  const d = visual.data ?? {};
  let body = "";
  if (/palette|swatch|color/.test(t)) body = palette(d);
  else if (/scorecard|score/.test(t)) body = scorecard(d);
  else if (/roadmap|timeline|phase/.test(t)) body = roadmap(d); // before "map" rule — "roadmap" contains "map"
  else if (/table|comparison|before/.test(t)) body = table(d);
  else if (/position|matrix|map|quadrant|2x2/.test(t)) body = quadrant(d);
  else if (/chart|bar|line|graph/.test(t)) body = chart(d);
  else if (/diagram|framework|flow|process/.test(t)) body = diagram(d);
  if (!body) return "";
  const title = visual.title ? `<p style="margin:0 0 12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:600;">${esc(visual.title)}</p>` : "";
  return `<div style="margin:20px 0 4px;padding:22px;background:${SURFACE};border:1px solid ${LINE};border-radius:10px;">${title}${body}</div>`;
}

function gauge(score: string): string {
  const m = String(score ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return "";
  const val = Math.max(0, Math.min(Number(m[1]), 100));
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - val / 100);
  return `<svg viewBox="0 0 140 140" width="140" height="140" style="display:block;margin:0 auto;">` +
    `<circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"></circle>` +
    `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${LIME}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 70 70)"></circle>` +
    `<text x="70" y="68" text-anchor="middle" font-size="34" font-weight="700" fill="${SURFACE}">${val}</text>` +
    `<text x="70" y="90" text-anchor="middle" font-size="11" letter-spacing=".06em" fill="${MUTED}">/ 100</text></svg>`;
}

function moodGrid(urls: string[], opts?: { compact?: boolean }): string {
  const imgs = urls.filter(Boolean);
  if (!imgs.length) return "";
  const cols = opts?.compact ? imgs.length : 2;
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;">` +
    imgs.map((u) => `<img src="${esc(u)}" alt="" style="width:100%;height:${opts?.compact ? "150px" : "auto"};object-fit:cover;border-radius:10px;display:block;" />`).join("") +
  `</div>`;
}

/* ---------------- the document ---------------- */

export function renderAuditHTML(company: string, audit: any, imageUrls: string[]): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const score = audit?.brand_assessment_score || "";
  const slides: any[] = audit?.slides || [];
  const moodImgs = (imageUrls || []).filter(Boolean);

  const sections = slides.map((s: any) => {
    const isMood = s.section_number === 11 || /image_prompt|mood/i.test(String(s?.visual?.type ?? ""));
    // Section 11's `insights` are raw DALL·E prompts — never show them; show the images instead.
    const insights = !isMood && Array.isArray(s.insights) && s.insights.length
      ? `<ul style="margin:0 0 0 18px;padding:0;">${s.insights.map((i: string) => `<li style="margin:0 0 8px;font-size:14.5px;line-height:1.6;color:#514E44;">${esc(i)}</li>`).join("")}</ul>` : "";
    const recs = Array.isArray(s.recommendations) && s.recommendations.length
      ? `<p style="margin:16px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${GREEN};font-weight:700;">Recommendations</p><ul style="margin:0 0 0 18px;padding:0;">${s.recommendations.map((r: string) => `<li style="margin:0 0 6px;font-size:14px;color:#514E44;">${esc(r)}</li>`).join("")}</ul>` : "";
    const metric = s.key_metric?.value
      ? `<div style="display:inline-block;margin:0 0 14px;padding:10px 16px;background:#EBF5EF;border-radius:8px;"><span style="font-size:26px;font-weight:700;color:${GREEN};">${esc(s.key_metric.value)}</span> <span style="font-size:12px;color:${MUTED};">${esc(s.key_metric.label || "")}</span></div>` : "";
    const visual = isMood ? moodGrid(moodImgs) : renderVisual(s.visual);
    const srcs = Array.isArray(s.sources) && s.sources.length
      ? `<p style="margin:18px 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:600;">Sources</p>${s.sources.map((x: any) => `<p style="margin:0 0 4px;font-size:11px;color:#ADA897;">${esc(x.claim || "")} — ${esc(x.source || "")}</p>`).join("")}` : "";
    return `<div style="padding:40px;border-top:2px solid ${LINE};">
      <span style="font-family:monospace;font-size:10px;color:${GREEN};">${String(s.section_number || "").padStart(2, "0")} / 13</span>
      <h2 style="margin:6px 0 4px;font-size:30px;font-weight:600;letter-spacing:-.02em;color:${INK};">${esc(s.title || "")}</h2>
      ${s.headline_insight ? `<p style="margin:0 0 18px;font-size:17px;line-height:1.5;color:${GREEN};font-style:italic;">${esc(s.headline_insight)}</p>` : ""}
      ${metric}
      ${insights}
      ${s.analysis ? `<p style="margin:14px 0 0;font-size:14.5px;line-height:1.65;color:#514E44;">${esc(s.analysis)}</p>` : ""}
      ${visual}
      ${recs}${srcs}
    </div>`;
  }).join("");

  const hero = moodImgs.length
    ? `<div style="padding:28px 40px;background:#1E1C14;">${moodGrid(moodImgs, { compact: true })}</div>` : "";

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:${INK};max-width:920px;margin:0 auto;background:${SURFACE};">
    <div style="padding:80px 40px 64px;background:${INK};color:${SURFACE};text-align:center;">
      <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${MUTED};margin:0 0 28px;">Spazio · Brand Audit</p>
      <h1 style="font-size:52px;font-weight:600;line-height:.95;letter-spacing:-.04em;margin:0 0 14px;">${esc(company || "Your Brand")}</h1>
      ${audit?.deck_title ? `<p style="font-size:16px;color:#ADA897;margin:0 0 28px;">${esc(audit.deck_title)}</p>` : ""}
      ${score ? `<div style="margin:16px 0 0;">${gauge(score)}<p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};margin:8px 0 0;">Brand Assessment</p></div>` : ""}
      <p style="font-size:12px;color:${MUTED};margin:24px 0 0;">${esc(date)} · Confidential</p>
    </div>
    ${hero}
    ${sections}
    <div style="padding:36px 40px;background:${INK};color:${SURFACE};">
      <p style="margin:0;font-size:12px;color:${MUTED};font-style:italic;">Human-led, AI-accelerated. Every creative decision is made by a real designer.</p>
    </div>
  </div>`.trim();
}
