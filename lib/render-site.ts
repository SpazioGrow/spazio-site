// Shared server-render of the Spazio SPA. Used by app/route.ts (home) and
// app/start-project/route.ts so a real /start-project URL boots the SPA straight
// into that view. Exposes config to the client without bundling secrets.
import { html } from "@/app/site-html";
import {
  BUDGET_OPTIONS, TIMELINE_OPTIONS, SERVICE_OPTIONS,
} from "@/lib/foundation-options";

export function renderSite(initialRoute?: string): Response {
  const scheduler = process.env.SCHEDULER_URL || "";
  const foundationOptions = { budget: BUDGET_OPTIONS, timeline: TIMELINE_OPTIONS, service: SERVICE_OPTIONS };
  const inject =
    `<script>window.SPAZIO_SCHEDULER_URL=${JSON.stringify(scheduler)};` +
    `window.SPAZIO_FOUNDATION_OPTIONS=${JSON.stringify(foundationOptions)};` +
    (initialRoute ? `window.SPAZIO_INITIAL_ROUTE=${JSON.stringify(initialRoute)};` : "") +
    `</script>`;
  const out = html.replace("</head>", `${inject}</head>`);
  return new Response(out, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
