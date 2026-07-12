// Public /start-project URL — serves the SPA booted straight into the
// Start-a-Project inquiry view (Journey 1). Separate from the paid Brand
// Intelligence Report flow.
import { renderSite } from "@/lib/render-site";

export const dynamic = "force-static";

export function GET() {
  return renderSite("start-project");
}
