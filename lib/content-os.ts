// Content OS — Airtable data layer for the Builds table.
// Field IDs for writes, field NAMES for GET reads (see lib/content-os-fields.ts).
// Never use typecast: true — select options are defined at table creation.
import {
  CONTENT_OS_BASE_ID,
  CONTENT_OS_TABLE_ID,
  COS_FIELDS,
  COS_FIELD_NAMES,
  COS_STATUS,
} from "./content-os-fields";

const AT_URL = `https://api.airtable.com/v0/${CONTENT_OS_BASE_ID}/${CONTENT_OS_TABLE_ID}`;

/** The Master Intake payload. Top-level identity fields are mapped to columns;
 *  the whole object is also stored verbatim in Intake JSON for the generate step. */
export interface ContentOSIntake {
  creatorName?: string;
  handle?: string;
  email?: string;
  platform?: string;
  links?: string | string[];
  // Strategy inputs consumed by /api/generate-content-os (kept flexible):
  business?: string;
  differentiation?: string;
  audience?: string;
  subNiche?: string;
  competitiveSet?: string;
  voiceReferences?: string;
  dmSample?: string;
  personalityCues?: string;
  capacity?: number | string;
  publisher?: string;
  tools?: string;
  goals?: string;
  /** Optional existing Leads record id to link this build to. */
  leadId?: string;
  [key: string]: unknown;
}

/** Logical → value patch for updateBuild. Keys map 1:1 to COS_FIELDS. */
export interface BuildPatch {
  creatorName?: string;
  handle?: string;
  email?: string;
  platform?: string;
  links?: string;
  status?: string;
  categoryScan?: string;
  foundation?: string;
  differentiation?: string;
  pillarsJson?: string;
  voiceJson?: string;
  cadenceJson?: string;
  operatingManualHtml?: string;
  formatStatus?: string;
  promptPackage?: string;
  buildJson?: string;
  asanaTaskGid?: string;
}

export interface ContentOSBuildRecord {
  id: string;
  /** Raw Airtable fields, keyed by FIELD NAME (GET reads use names). */
  fields: Record<string, unknown>;
  /** Parsed Intake JSON, or null if absent/unparseable. */
  intake: ContentOSIntake | null;
}

function atHeaders(): Record<string, string> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_TOKEN not set");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  return v == null ? "" : String(v);
}

function normalizeLinks(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.filter(Boolean).join("\n");
  return str(v);
}

/** Convert a logical patch into a field-ID-keyed record for Airtable writes. */
function toFieldIdRecord(patch: BuildPatch): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue;
    const id = (COS_FIELDS as Record<string, string>)[k];
    if (id) out[id] = String(v);
  }
  return out;
}

/** Create a Content OS Builds record (Status = New, Intake JSON stored). Returns recordId. */
export async function createBuild(intake: ContentOSIntake): Promise<string> {
  const fields: Record<string, unknown> = {
    [COS_FIELDS.intakeJson]: JSON.stringify(intake),
    [COS_FIELDS.status]: COS_STATUS.New,
  };
  const creatorName = str(intake.creatorName);
  const handle = str(intake.handle);
  const email = str(intake.email);
  const platform = str(intake.platform);
  const links = normalizeLinks(intake.links);
  if (creatorName) fields[COS_FIELDS.creatorName] = creatorName;
  if (handle) fields[COS_FIELDS.handle] = handle;
  if (email) fields[COS_FIELDS.email] = email;
  if (platform) fields[COS_FIELDS.platform] = platform;
  if (links) fields[COS_FIELDS.links] = links;
  if (intake.leadId) fields[COS_FIELDS.lead] = [intake.leadId];

  const res = await fetch(AT_URL, {
    method: "POST",
    headers: atHeaders(),
    body: JSON.stringify({ records: [{ fields }] }),
  });
  if (!res.ok) throw new Error(`Airtable create failed ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const id = data.records?.[0]?.id;
  if (!id) throw new Error("Airtable create returned no record id");
  return id;
}

/** Patch a build by record id. No-op if patch is empty. */
export async function updateBuild(recordId: string, patch: BuildPatch): Promise<void> {
  const fields = toFieldIdRecord(patch);
  if (Object.keys(fields).length === 0) return;
  const res = await fetch(`${AT_URL}/${recordId}`, {
    method: "PATCH",
    headers: atHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable update failed ${res.status}: ${await res.text().catch(() => "")}`);
}

/** Fetch a build by record id. Fields are keyed by NAME; Intake JSON is parsed. */
export async function getBuild(recordId: string): Promise<ContentOSBuildRecord | null> {
  const res = await fetch(`${AT_URL}/${recordId}`, { headers: atHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Airtable get failed ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const fields: Record<string, unknown> = data.fields ?? {};

  let intake: ContentOSIntake | null = null;
  const rawIntake = fields[COS_FIELD_NAMES.intakeJson];
  if (typeof rawIntake === "string" && rawIntake.trim()) {
    try {
      intake = JSON.parse(rawIntake) as ContentOSIntake;
    } catch {
      intake = null;
    }
  }
  return { id: data.id, fields, intake };
}
