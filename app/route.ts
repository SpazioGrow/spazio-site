import { renderSite } from "@/lib/render-site";

export const dynamic = "force-static";

export function GET() {
  return renderSite();
}
