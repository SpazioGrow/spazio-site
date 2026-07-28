// Public /ways-to-partner URL — serves the SPA booted straight into the
// Ways to Partner view. Mirrors app/start-project/route.ts.
import { renderSite } from "@/lib/render-site";

export const dynamic = "force-static";

export function GET() {
  return renderSite("ways-to-partner");
}
