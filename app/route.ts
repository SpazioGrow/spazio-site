import { html } from "./site-html";

export const dynamic = "force-static";

export function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
