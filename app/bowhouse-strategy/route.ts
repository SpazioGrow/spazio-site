// Public /bowhouse-strategy URL — serves the SPA booted straight into the
// Bowhouse brand-strategy case-study page. Mirrors app/ways-to-partner/route.ts.
import { renderSite } from "@/lib/render-site";

export const dynamic = "force-static";

export function GET() {
  return renderSite("bowhouse-strategy");
}
