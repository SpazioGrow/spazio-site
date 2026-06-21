// lib/foundation-options.ts
// Single source of truth for the foundation form's select vocabularies.
// The form renders its buttons from these (injected by app/route.ts as
// window.SPAZIO_FOUNDATION_OPTIONS) and /api/foundation validates against the
// SAME lists — so the form and the route can never silently drift.
// Strings use en-dashes ("–"), not hyphens. These ARE the canonical option names.

export const BUDGET_OPTIONS = [
  "$2k–$5k", "$5k–$10k", "$10k–$25k", "$25k+", "Prefer to discuss",
] as const;

export const TIMELINE_OPTIONS = [
  "ASAP", "1–2 months", "3–6 months", "Just exploring",
] as const;

// Service Interest — canonical set (empty option + "Brand" dupe dropped).
export const SERVICE_OPTIONS = [
  "Brand Identity", "Packaging", "Website", "Digital Product", "Full Package", "UX", "Not Sure",
] as const;

// Source — the Lead Source options currently defined in Airtable. "Comp / Test"
// is intentionally NOT here yet (it isn't a defined option), so the comp path's
// value falls to Notes instead of 422-ing the record.
export const SOURCE_OPTIONS = [
  "Website", "Referral", "Instagram", "Other", "Claude Research",
  "Website Form", "Foundation Form", "Festival Lead", "Positioned Ad Set",
] as const;
