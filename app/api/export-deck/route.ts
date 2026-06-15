// Export Deck — 10-slide consulting-grade PPTX
// Reads structured data from Airtable Brief HTML, generates polished PPTX

import PptxGenJS from "pptxgenjs";

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";
const IMG_FIELD = "fldPVXauT9v4GqVZm";

// Brand palette — Forest & Moss from skill guide
const C = {
  dark: "17160F", cream: "FAF8F2", ink: "17160F", ink2: "514E44",
  accent: "2C5F2D", accentLight: "97BC62", bg: "FFFFFF",
  muted: "847F71", line: "DFD9C9", cardBg: "F5F3ED",
  white: "FFFFFF", darkCard: "1E2222",
};

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').trim();
}

// Parse the HTML deck into structured slide data
function parseSlides(html: string): any[] {
  const slideBlocks = html.split(/SLIDE \d+ \/ 10/).slice(1);
  return slideBlocks.map(block => {
    const titleMatch = block.match(/<h2[^>]*>(.*?)<\/h2>/);
    const subtitleMatch = block.match(/<p[^>]*style="[^"]*opacity[^"]*"[^>]*>(.*?)<\/p>/);
    const metricValueMatch = block.match(/font-size:36px[^>]*>(.*?)<\/span>/);
    const metricLabelMatch = block.match(/font-size:14px[^>]*>(.*?)<\/span>/);
    const pointMatches = [...block.matchAll(/font-size:15px[^>]*>(.*?)<\/p>/g)];
    return {
      title: titleMatch ? strip(titleMatch[1]) : "",
      subtitle: subtitleMatch ? strip(subtitleMatch[1]) : "",
      metric: metricValueMatch ? { value: strip(metricValueMatch[1]), label: metricLabelMatch ? strip(metricLabelMatch[1]) : "" } : null,
      points: pointMatches.map(m => strip(m[1])).filter(p => p.length > 5),
    };
  });
}

async function fetchImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch { return null; }
}

export async function GET(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return new Response("Not configured", { status: 500 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("Missing ID", { status: 400 });

  // Fetch report + lead + images
  let briefHTML = "", company = "", name = "", service = "";
  let imageUrls: string[] = [];
  try {
    const rr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!rr.ok) return new Response("Not found", { status: 404 });
    const rd = await rr.json();
    briefHTML = rd.fields?.["Brief HTML"] || "";
    const imgs = rd.fields?.["Mood Board Images"] || [];
    imageUrls = imgs.map((img: any) => img.url).filter(Boolean);

    const lLinks = rd.fields?.["Lead"];
    const lid = Array.isArray(lLinks) && lLinks.length ? lLinks[0] : "";
    if (lid) {
      const lr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}/${lid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (lr.ok) {
        const ld = await lr.json();
        name = ld.fields?.["Name"] || "";
        company = ld.fields?.["Company "] || ld.fields?.["Company"] || "";
        const svc = ld.fields?.["Service Interest"];
        service = typeof svc === "object" && svc?.name ? svc.name : (typeof svc === "string" ? svc : "");
      }
    }
  } catch { return new Response("Database error", { status: 502 }); }

  if (!briefHTML) return new Response("No deck content", { status: 404 });

  const slides = parseSlides(briefHTML);
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const pptx = new PptxGenJS();
  pptx.author = "Spazio";
  pptx.title = `Brand Vision — ${company || name}`;
  pptx.layout = "LAYOUT_WIDE";

  // Helper: add a stat callout
  const addMetric = (slide: any, metric: any, x: number, y: number, dark = false) => {
    if (!metric?.value) return;
    slide.addText(metric.value, { x, y, w: 2.5, h: 0.6, fontSize: 40, bold: true, color: C.accent, fontFace: "Cambria" });
    slide.addText(metric.label || "", { x, y: y + 0.55, w: 2.5, h: 0.3, fontSize: 11, color: dark ? "ADA897" : C.muted, fontFace: "Calibri" });
  };

  // Helper: numbered points in two columns
  const addPoints = (slide: any, points: string[], x: number, y: number, w: number, dark = false) => {
    const col1 = points.slice(0, 2);
    const col2 = points.slice(2, 4);
    const textColor = dark ? "CDCABD" : C.ink;
    const numColor = C.accentLight;
    col1.forEach((p, i) => {
      slide.addText(`0${i + 1}`, { x, y: y + i * 0.95, w: 0.4, h: 0.3, fontSize: 10, fontFace: "Courier New", color: numColor });
      slide.addText(p, { x: x + 0.4, y: y + i * 0.95, w: w / 2 - 0.6, h: 0.85, fontSize: 12, color: textColor, fontFace: "Calibri", lineSpacingMultiple: 1.35, valign: "top" });
    });
    col2.forEach((p, i) => {
      slide.addText(`0${i + 3}`, { x: x + w / 2, y: y + i * 0.95, w: 0.4, h: 0.3, fontSize: 10, fontFace: "Courier New", color: numColor });
      slide.addText(p, { x: x + w / 2 + 0.4, y: y + i * 0.95, w: w / 2 - 0.6, h: 0.85, fontSize: 12, color: textColor, fontFace: "Calibri", lineSpacingMultiple: 1.35, valign: "top" });
    });
  };

  // === SLIDE 1: TITLE (dark) ===
  const s1 = pptx.addSlide();
  s1.background = { color: C.dark };
  s1.addText("SPAZIO", { x: 0.7, y: 0.5, w: 3, fontSize: 10, color: C.muted, fontFace: "Calibri" });
  s1.addText("Brand Vision Deck", { x: 0.7, y: 0.72, w: 3, fontSize: 10, color: "ADA897", fontFace: "Calibri" });
  s1.addText(company || name || "Your Brand", { x: 0.7, y: 2.0, w: 8, fontSize: 48, bold: true, color: C.cream, fontFace: "Cambria" });
  s1.addText(service || "Strategic Brief", { x: 0.7, y: 3.1, w: 8, fontSize: 18, color: "ADA897", fontFace: "Calibri" });
  s1.addText(`${date}  ·  Confidential`, { x: 0.7, y: 4.6, w: 5, fontSize: 10, color: C.muted, fontFace: "Calibri" });
  if (slides[0]?.metric) addMetric(s1, slides[0].metric, 8.5, 4.2, true);

  // === SLIDES 2-7: CONTENT (light, varied layouts) ===
  for (let i = 1; i <= 6; i++) {
    const sd = slides[i] || { title: `Slide ${i + 1}`, subtitle: "", points: [], metric: null };
    const s = pptx.addSlide();
    s.background = { color: C.bg };

    // Header area
    s.addText(`${String(i + 1).padStart(2, "0")} / 10`, { x: 0.7, y: 0.4, w: 2, fontSize: 9, fontFace: "Courier New", color: C.accent });
    s.addText(sd.title, { x: 0.7, y: 0.65, w: 7, fontSize: 32, bold: true, fontFace: "Cambria", color: C.ink });
    s.addText(sd.subtitle || "", { x: 0.7, y: 1.25, w: 7, fontSize: 13, fontFace: "Calibri", color: C.muted });

    // Metric callout on right
    if (sd.metric?.value) addMetric(s, sd.metric, 9.0, 0.65);

    // Points in two-column grid
    addPoints(s, sd.points || [], 0.7, 1.9, 11.0);
  }

  // === SLIDE 8: MOODBOARD ===
  const s8 = pptx.addSlide();
  s8.background = { color: C.bg };
  s8.addText("08 / 10", { x: 0.7, y: 0.4, w: 2, fontSize: 9, fontFace: "Courier New", color: C.accent });
  s8.addText("Moodboard", { x: 0.7, y: 0.65, w: 7, fontSize: 32, bold: true, fontFace: "Cambria", color: C.ink });
  s8.addText("Visual direction and brand aesthetic", { x: 0.7, y: 1.25, w: 7, fontSize: 13, fontFace: "Calibri", color: C.muted });

  // Load and embed images
  const imgData = await Promise.all(imageUrls.slice(0, 4).map(fetchImage));
  const positions = [
    { x: 0.7, y: 1.7, w: 5.4, h: 3.0 },
    { x: 6.3, y: 1.7, w: 5.4, h: 3.0 },
    { x: 0.7, y: 1.7, w: 5.4, h: 3.0 },  // fallback positions
    { x: 6.3, y: 1.7, w: 5.4, h: 3.0 },
  ];
  // 2x2 grid if 4 images, 1x2 if 2
  if (imgData.filter(Boolean).length >= 3) {
    const grid = [
      { x: 0.7, y: 1.65, w: 5.3, h: 1.4 },
      { x: 6.2, y: 1.65, w: 5.3, h: 1.4 },
      { x: 0.7, y: 3.2, w: 5.3, h: 1.4 },
      { x: 6.2, y: 3.2, w: 5.3, h: 1.4 },
    ];
    imgData.forEach((d, j) => { if (d && j < 4) s8.addImage({ data: d, ...grid[j] }); });
  } else {
    imgData.forEach((d, j) => { if (d && j < 2) s8.addImage({ data: d, ...positions[j] }); });
  }
  s8.addText("AI concept placeholders — licensed imagery for finals", { x: 0.7, y: 4.75, w: 8, fontSize: 9, italic: true, color: C.muted, fontFace: "Calibri" });

  // === SLIDE 9: ROADMAP ===
  const s9data = slides[8] || { title: "Roadmap", points: [] };
  const s9 = pptx.addSlide();
  s9.background = { color: C.bg };
  s9.addText("09 / 10", { x: 0.7, y: 0.4, w: 2, fontSize: 9, fontFace: "Courier New", color: C.accent });
  s9.addText(s9data.title, { x: 0.7, y: 0.65, w: 7, fontSize: 32, bold: true, fontFace: "Cambria", color: C.ink });
  // Roadmap as horizontal phases
  const phases = s9data.points || [];
  const phaseW = 10.6 / Math.max(phases.length, 3);
  phases.forEach((p: string, j: number) => {
    const px = 0.7 + j * phaseW;
    s9.addText(`Phase ${j + 1}`, { x: px, y: 1.5, w: phaseW - 0.2, h: 0.35, fontSize: 11, bold: true, fontFace: "Calibri", color: C.accent });
    s9.addText(p, { x: px, y: 1.9, w: phaseW - 0.2, h: 1.5, fontSize: 12, fontFace: "Calibri", color: C.ink, lineSpacingMultiple: 1.35, valign: "top" });
  });
  if (s9data.metric?.value) addMetric(s9, s9data.metric, 9.0, 0.65);

  // === SLIDE 10: NEXT STEPS (dark) ===
  const s10data = slides[9] || { title: "Next Steps", points: [] };
  const s10 = pptx.addSlide();
  s10.background = { color: C.dark };
  s10.addText("10 / 10", { x: 0.7, y: 0.4, w: 2, fontSize: 9, fontFace: "Courier New", color: C.accentLight });
  s10.addText(s10data.title, { x: 0.7, y: 0.65, w: 7, fontSize: 32, bold: true, fontFace: "Cambria", color: C.cream });
  addPoints(s10, s10data.points || [], 0.7, 1.5, 11.0, true);
  s10.addText("Human-led, AI-accelerated. Every creative decision is made by a real designer.", { x: 0.7, y: 4.3, w: 8, fontSize: 12, italic: true, color: "847F71", fontFace: "Calibri" });
  s10.addText("spazio  ·  spaziographics.com", { x: 0.7, y: 4.7, w: 5, fontSize: 10, color: C.muted, fontFace: "Calibri" });

  // Generate
  const buf = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const filename = `Spazio-${(company || name || "Brand").replace(/[^A-Za-z0-9]/g, "-")}-Vision-Deck.pptx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
