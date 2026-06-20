// Brand Gap Audit checkout — payment handled manually for now.
export async function GET() {
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
