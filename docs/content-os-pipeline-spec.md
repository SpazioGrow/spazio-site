# Content OS Pipeline — Claude Code Build Spec
*Paste into a Claude Code session in SpazioGrow/spazio-site. Mirrors the existing Brand Intelligence Report pipeline. API-only this pass — no public funnel (pilot runs internal). Main auto-deploys to Vercel.*

---

## Goal

Stand up the backend that turns one completed Master Intake into review-ready drafts of the five Content OS components, dropped into Airtable + an Asana review task for Christine to curate. Same shape as the deck pipeline: intake → Airtable record → background AI draft → Asana review task → Christine reviews and delivers.

**The pipeline drafts 4.5 of 5 components.** Foundation, Pillars, Voice & Tone, Cadence & Workflow are AI-drafted; the Operating Manual is assembled from them. **Format is NOT generated** — it's the hand-built Figma kit brand-swap, flagged on the record for Christine's review pass.

---

## Non-negotiable conventions (existing repo rules)

- **Verify Airtable schema before writing.** Create the table, then fetch real field IDs into a constants file. Never hardcode guessed IDs.
- **Never `typecast: true`** — it pollutes select-field taxonomies. Define select options explicitly at table creation.
- **Field IDs for writes, field names for GET reads.**
- Reuse the existing Perplexity + OpenAI client wrappers from the deck pipeline. Respect `PERPLEXITY_MODEL` override (default `sonar`).
- Generation is **decoupled and fire-and-forget** — intake returns immediately, generate runs in background. If any AI step fails, a paste-ready Prompt Package is still written to the record so Christine can run it manually.
- **Invisible infrastructure:** every stored output reads as a Spazio deliverable in Spazio's voice. No "AI," no prompt text, no model names in any client-facing field.

**Context constants**
- Base: `appv2sIRwDvNPjV7j` · Leads `tbl5qLZO9mAN9LQ0P` · Brand Intelligence Reports `tbl7hxUDQRJLjUpKQ`
- Env: `AIRTABLE_TOKEN`, `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `ASANA_TOKEN`
- Existing Asana review project (deck): `1215677774689770` — pattern to copy.

---

## Step 1 — Data layer: new `Content OS Builds` table

Create the table (metadata API or UI), then write real field IDs into `lib/content-os-fields.ts`. Schema:

| Field | Type | Notes |
|---|---|---|
| Creator Name | Single line | |
| Handle | Single line | |
| Email | Single line | clean name, no trailing space |
| Platform | Single line | avoid select pollution; freeform |
| Links | Long text | |
| Intake JSON | Long text | full structured intake payload |
| Status | Single select | options defined explicitly: `New`, `Drafting`, `Ready for Review`, `Delivered` |
| Category Scan | Long text | Perplexity output |
| Foundation | Long text | positioning spine |
| Differentiation | Long text | the one owned thing |
| Pillars JSON | Long text | candidate pillars + rationale |
| Voice JSON | Long text | attributes, do/don't, example rewrites |
| Cadence JSON | Long text | mix, rhythm, empty calendar scaffold |
| Operating Manual HTML | Long text | assembled draft (mirrors Brief HTML) |
| Format Status | Single select | `Pending Figma Swap`, `Done` |
| Prompt Package | Long text | paste-ready fallback (mirrors Deck JSON) |
| Build JSON | Long text | full output blob |
| Asana Task GID | Single line | stamped at task creation |
| Lead | Link to Leads | optional |

---

## Step 2 — `lib/content-os.ts`

Types + Airtable read/write helpers keyed on the field IDs from Step 1. One `createBuild(intake)`, one `updateBuild(recordId, patch)`, one `getBuild(recordId)`.

---

## Step 3 — `POST /api/content-os-intake`

- Accepts the Master Intake as JSON.
- Creates a `Content OS Builds` record (`Status = New`, Intake JSON stored).
- Fires `/api/generate-content-os` in the background (don't await), returns `{ recordId }` immediately.
- For the pilot: post to this directly (curl / internal form). Public stepper is a later pass.

---

## Step 4 — `POST /api/generate-content-os`

Background chain. Set `Status = Drafting` on entry. Each AI call returns **JSON only, no preamble, no markdown** — parse safely, strip fences.

**A. Category scan** — Perplexity (`sonar`, `PERPLEXITY_MODEL` override). Input: sub-niche + competitive set + audience from intake. Researches the landscape so Foundation and Pillars can find open territory. Store → Category Scan. Verbatim prompt:

```
Research the content landscape for this creator's niche. Use the sub-niche, the named
competitive set, and the target audience below.

Report, concisely:
- What the named competitors actually post about — the territories they already own.
- Where the field clusters (the crowded, repeated angles everyone runs).
- 2–3 specific OPEN territories the competitive set is NOT serving for this audience.
- Any audience tensions or unmet needs the field ignores.

Be concrete and cite what each competitor is known for. Do not invent competitors not listed.
Return prose (no markdown headers needed); this is research feeding an internal strategy step.
```

**B. Foundation synthesis** — OpenAI. Input: business, audience, sub-niche, competitive set, category scan. Output JSON: `{ foundation: string, differentiation: string }`. The positioning spine; everything else hangs off it. Store → Foundation, Differentiation.

**C. Pillars** — OpenAI. Input: foundation + category scan + competitive set. Output JSON: `{ pillars: [{ name, rationale }] }` — 4–6 **candidates** (Christine cuts to 3–5 in review), each mapped against what competitors already own. Store → Pillars JSON.

**D. Voice & Tone** — OpenAI. Input: voice references, the real DM sample, personality cues, foundation. Output JSON: `{ attributes: [...], do_dont: [{do, dont}], examples: [{ before, after }] }` — 3–4 example rewrites anchored to the real DM sample. Store → Voice JSON.

**E. Cadence & Workflow** — OpenAI. Input: pillars + posting reality + goals. Output JSON: `{ mix: {...}, weekly_rhythm: [...], calendar_scaffold: [...], workflow: [...] }` — recommended pillar mix, weekly rhythm, an **empty** calendar structure (never filled), and the idea→draft→publish workflow with who-does-what. Store → Cadence JSON.

**F. Assemble Operating Manual** — build `Operating Manual HTML` from B–E in Spazio's voice (mirror the Brief HTML builder). Format section = placeholder: "Brand template system — pending Figma brand-swap." Set `Format Status = Pending Figma Swap`.

**G. Prompt Package** — assemble a single paste-ready package (intake + category scan + the five draft instructions) and store → Prompt Package. This is the manual fallback if any OpenAI step throws.

**H. Persist** — write all outputs + `Build JSON` (field IDs, no typecast). Set `Status = Ready for Review`.

**I. Asana** — create a task in a new project `Content OS Reviews (Internal)` with the build summary + Airtable record link. Stamp the returned task GID → Asana Task GID. (Create the project once, store GID as `ASANA_CONTENT_OS_PROJECT_GID`.)

**Guardrails in every prompt:** outputs are review-ready **drafts** (candidates, not final calls); Christine selects/kills/merges in curation. Spazio voice throughout. Never expose AI/prompt/model. Do not generate Format.

---

## Step 5 — Resilience

- Idempotent on `recordId`; safe to re-run a failed build.
- If an AI step fails, log it, keep going where possible, and leave `Prompt Package` intact so the build is recoverable by hand.
- `Status` reflects state (`Drafting` → `Ready for Review`); never overwrite anything from the sales/Leads taxonomy.

---

## Build order (test each before moving on)

1. Create + verify `Content OS Builds`; capture field IDs → `lib/content-os-fields.ts`.
2. `lib/content-os.ts` helpers.
3. `/api/content-os-intake` — create record + fire generate.
4. `/api/generate-content-os` — A–I chain.
5. Prompt Package fallback path.
6. End-to-end test with one real intake payload; confirm record fields + Asana task land correctly.

## Done when

One real creator's Master Intake POSTed to `/api/content-os-intake` produces, with no further input: a fully populated `Content OS Builds` record (foundation, pillars, voice, cadence, assembled manual draft), a paste-ready Prompt Package, and an Asana review task GID stamped back. Format flagged pending. Ready for Christine to curate.

---

*Note: the draft prompts above are starter versions to get the chain running. Phase 2 tunes each against its review rubric. Build the working pipeline first; refine prompt content second.*
