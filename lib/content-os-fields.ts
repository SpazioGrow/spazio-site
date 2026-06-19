// Content OS Builds — Airtable field IDs (source of truth for writes).
// Captured from the real table created via the Airtable metadata API on
// base appv2sIRwDvNPjV7j. Do NOT hand-edit IDs — re-read from the schema if
// the table changes. Field IDs are used for writes; field NAMES for GET reads.

export const CONTENT_OS_BASE_ID = "appv2sIRwDvNPjV7j";
export const CONTENT_OS_TABLE_ID = "tbl3RZMoSs4xMRG7P";

/** Field IDs, keyed by logical name (use these for create/update writes). */
export const COS_FIELDS = {
  creatorName: "fldyBACNpCXfELMV2", // primary, singleLineText
  handle: "fld9sEsxXfrNZgScI", // singleLineText
  email: "fldZv0spwjOZGEORm", // singleLineText
  platform: "fldd1KmYK4lhlljkA", // singleLineText
  links: "fldRJcCvPTQ98m4Ri", // multilineText
  intakeJson: "fldNvwCDiN0EvIOmC", // multilineText
  status: "fldcjG1Kmsg1gUEuU", // singleSelect
  categoryScan: "fld7JtwubosnVXD1b", // multilineText
  foundation: "fldKd3BEGn5ywuBD9", // multilineText
  differentiation: "fld3KBITIYkGsTzA1", // multilineText
  pillarsJson: "fld6GXhFWantcAVnY", // multilineText
  voiceJson: "fldPZz5Mx4yPuKQ5k", // multilineText
  cadenceJson: "fldCgUaKY5zzvpyxw", // multilineText
  operatingManualHtml: "fld796FqrXdhvTW0N", // multilineText
  formatStatus: "fldkQPOssN0FVGVvW", // singleSelect
  promptPackage: "fldd5hlnIIeLXotUv", // multilineText
  buildJson: "fldYYkQ2ur8LaLv5R", // multilineText
  asanaTaskGid: "fldcDVeHYdh3U1QWP", // singleLineText
  lead: "fldDGKdJmo4KljJuK", // multipleRecordLinks -> Leads (tbl5qLZO9mAN9LQ0P)
} as const;

/** Field NAMES, keyed the same way (use these to read fields off a GET response). */
export const COS_FIELD_NAMES = {
  creatorName: "Creator Name",
  handle: "Handle",
  email: "Email",
  platform: "Platform",
  links: "Links",
  intakeJson: "Intake JSON",
  status: "Status",
  categoryScan: "Category Scan",
  foundation: "Foundation",
  differentiation: "Differentiation",
  pillarsJson: "Pillars JSON",
  voiceJson: "Voice JSON",
  cadenceJson: "Cadence JSON",
  operatingManualHtml: "Operating Manual HTML",
  formatStatus: "Format Status",
  promptPackage: "Prompt Package",
  buildJson: "Build JSON",
  asanaTaskGid: "Asana Task GID",
  lead: "Lead",
} as const;

/** Explicit select-option values (defined at table creation; never typecast). */
export const COS_STATUS = {
  New: "New",
  Drafting: "Drafting",
  ReadyForReview: "Ready for Review",
  Delivered: "Delivered",
} as const;

export const COS_FORMAT_STATUS = {
  PendingFigmaSwap: "Pending Figma Swap",
  Done: "Done",
} as const;

export type CosFieldKey = keyof typeof COS_FIELDS;
