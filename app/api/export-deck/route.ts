// Export Deck — generates a downloadable PPTX from the report data.
// GET /api/export-deck?id=recXXXXX → returns .pptx file

import PptxGenJS from "pptxgenjs";

const BASE_ID = "appv2sIRwDvNPjV7j";
const REPORTS_TABLE = "tbl7hxUDQRJLjUpKQ";
const LEADS_TABLE = "tbl5qLZO9mAN9LQ0P";

const REPORT_FIELDS = {
  answers: "fldgTPk5L6fnvZzZo",
  briefHTML: "fld3ZgwxOlFRK27Qx",
  lead: "flduD1QjX8XxucINU",
  status: "fldLUKmsHhqidDFWb",
} as const;
const LEAD_FIELDS = {
  name: "fldcNCcvpv3UYK7sR", company: "fldK7UmiFjbqxuibh",
  service: "fld15eMrZbh2n8Kev",
} as const;

const BRAND = { bg: "FAF8F2", ink: "17160F", ink2: "514E44", accent: "3E7D5A", line: "DFD9C9", muted: "847F71" };

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
}

export async function GET(request: Request) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return new Response("Server not configured", { status: 500 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("Missing report ID", { status: 400 });

  // Fetch report
  let briefHTML = "", company = "", service = "", name = "";
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${REPORTS_TABLE}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new Response("Report not found", { status: 404 });
    const data = await res.json();
    briefHTML = data.fields?.[REPORT_FIELDS.briefHTML] || "";

    const leadLinks = data.fields?.[REPORT_FIELDS.lead];
    const leadId = Array.isArray(leadLinks) && leadLinks.length ? leadLinks[0] : "";
    if (leadId) {
      const lr = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${LEADS_TABLE}/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (lr.ok) {
        const ld = await lr.json();
        name = ld.fields?.[LEAD_FIELDS.name] || "";
        company = ld.fields?.[LEAD_FIELDS.company] || "";
        const svc = ld.fields?.[LEAD_FIELDS.service];
        service = typeof svc === "object" && svc?.name ? svc.name : (typeof svc === "string" ? svc : "");
      }
    }
  } catch { return new Response("Database error", { status: 502 }); }

  if (!briefHTML) return new Response("No deck content found", { status: 404 });

  // Parse sections from the HTML deck
  const sections = briefHTML.split(/<!-- PAGE \d+/).filter(Boolean);

  // Extract research text and directions from HTML
  const researchMatch = briefHTML.match(/Market &amp; Brand Intelligence<\/p>([\s\S]*?)(?=<!-- PAGE|Creative Directions)/);
  const researchText = researchMatch ? stripHTML(researchMatch[1]).slice(0, 2000) : "Research pending.";

  const directionBlocks = briefHTML.match(/<div style="margin-bottom: 48px[\s\S]*?(?=<div style="margin-bottom: 48px|<!-- PAGE 4|$)/g) || [];
  const directions = directionBlocks.map(block => {
    const nameMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/);
    const conceptMatch = block.match(/<p style="font-size: 16px[^>]*>(.*?)<\/p>/);
    const imgMatch = block.match(/src="([^"]+)"/);
    return {
      name: nameMatch ? stripHTML(nameMatch[1]) : "Direction",
      concept: conceptMatch ? stripHTML(conceptMatch[1]) : "",
      imageUrl: imgMatch ? imgMatch[1] : "",
    };
  });

  // Build PPTX
  const pptx = new PptxGenJS();
  pptx.author = "Spazio";
  pptx.title = `Brand Intelligence — ${company || name}`;
  pptx.layout = "LAYOUT_WIDE";

  // Slide 1: Cover
  const s1 = pptx.addSlide();
  s1.background = { color: BRAND.bg };
  s1.addText("SPAZIO — BRAND INTELLIGENCE REPORT", { x: 0.8, y: 1.5, w: "80%", fontSize: 10, color: BRAND.muted, align: "center" });
  s1.addText(company || name || "Your Brand", { x: 0.8, y: 2.2, w: "80%", fontSize: 44, color: BRAND.ink, bold: true, align: "center" });
  s1.addText(service || "Strategic Brief", { x: 0.8, y: 3.3, w: "80%", fontSize: 18, color: BRAND.ink2, align: "center" });
  s1.addText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), { x: 0.8, y: 4.0, w: "80%", fontSize: 11, color: BRAND.muted, align: "center" });

  // Slide 2: Research
  const s2 = pptx.addSlide();
  s2.background = { color: BRAND.bg };
  s2.addText("MARKET & BRAND INTELLIGENCE", { x: 0.8, y: 0.4, w: "90%", fontSize: 10, color: BRAND.accent });

  // Split research into chunks that fit on slides
  const researchChunks = researchText.match(/.{1,800}/g) || [researchText];
  s2.addText(researchChunks[0], { x: 0.8, y: 0.95, w: 5.2, fontSize: 11, color: BRAND.ink, lineSpacingMultiple: 1.4 });
  if (researchChunks[1]) {
    s2.addText(researchChunks[1], { x: 6.3, y: 0.95, w: 5.2, fontSize: 11, color: BRAND.ink, lineSpacingMultiple: 1.4 });
  }

  // Slides 3-5: Creative Directions (one per slide)
  for (let i = 0; i < directions.length && i < 3; i++) {
    const d = directions[i];
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addText(`CREATIVE DIRECTION 0${i + 1}`, { x: 0.8, y: 0.4, w: "90%", fontSize: 10, color: BRAND.accent });
    s.addText(d.name, { x: 0.8, y: 1.0, w: 5.0, fontSize: 28, color: BRAND.ink, bold: true });
    s.addText(d.concept, { x: 0.8, y: 1.8, w: 5.0, fontSize: 13, color: BRAND.ink2, lineSpacingMultiple: 1.5 });
    s.addText("Concept placeholder — licensed imagery for finals", { x: 0.8, y: 3.0, w: 5.0, fontSize: 9, color: BRAND.muted, italic: true });

    if (d.imageUrl) {
      try {
        const imgRes = await fetch(d.imageUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = imgRes.headers.get("content-type") || "image/png";
          s.addImage({ data: `data:${mime};base64,${b64}`, x: 6.2, y: 0.9, w: 5.8, h: 3.3, rounding: true });
        }
      } catch { /* image fetch failed, skip */ }
    }
  }

  // Slide 6: Next Steps
  const s6 = pptx.addSlide();
  s6.background = { color: BRAND.bg };
  s6.addText("NEXT STEPS", { x: 0.8, y: 0.4, w: "90%", fontSize: 10, color: BRAND.accent });
  s6.addText("1. Review & select — Choose the direction that resonates, or tell us what to adjust.\n\n2. Design development — Your Spazio designer builds out the selected direction into a full brand system.\n\n3. Refinement — Two rounds of refinement to dial in every detail.", { x: 0.8, y: 1.1, w: 7.0, fontSize: 14, color: BRAND.ink, lineSpacingMultiple: 1.4 });
  s6.addText("Human-led, AI-accelerated.\nEvery creative decision is made by a real designer.", { x: 0.8, y: 3.5, w: 7.0, fontSize: 12, color: BRAND.muted, italic: true, lineSpacingMultiple: 1.3 });

  // Generate and return
  const pptxBuf = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const uint8 = new Uint8Array(pptxBuf);
  const filename = `Spazio-${(company || name || "Brand").replace(/[^A-Za-z0-9]/g, "-")}-Brief.pptx`;

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
