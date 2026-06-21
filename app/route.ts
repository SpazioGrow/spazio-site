import { html } from "./site-html";
import {
  BUDGET_OPTIONS, TIMELINE_OPTIONS, SERVICE_OPTIONS,
} from "@/lib/foundation-options";

export const dynamic = "force-static";

export function GET() {
  // Expose config to the client SPA without bundling secrets. SCHEDULER_URL is a
  // plain config value; the foundation option vocab is the single source of truth
  // shared with /api/foundation (the form renders its select chips from this).
  const scheduler = process.env.SCHEDULER_URL || "";
  const foundationOptions = { budget: BUDGET_OPTIONS, timeline: TIMELINE_OPTIONS, service: SERVICE_OPTIONS };
  const inject =
    `<script>window.SPAZIO_SCHEDULER_URL=${JSON.stringify(scheduler)};` +
    `window.SPAZIO_FOUNDATION_OPTIONS=${JSON.stringify(foundationOptions)};</script>`;
  const out = html.replace("</head>", `${inject}</head>`);
  return new Response(out, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
