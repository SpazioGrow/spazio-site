import { html } from "./site-html";

export const dynamic = "force-static";

export function GET() {
  // Expose the scheduling URL to the client SPA without bundling a secret —
  // SCHEDULER_URL is a plain config value, injected server-side at render.
  const scheduler = process.env.SCHEDULER_URL || "";
  const inject = `<script>window.SPAZIO_SCHEDULER_URL=${JSON.stringify(scheduler)};</script>`;
  const out = html.replace("</head>", `${inject}</head>`);
  return new Response(out, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
