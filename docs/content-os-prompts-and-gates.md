# Spazio Content OS — Draft Prompts + Validation Gates
*Internal operator doc. Phase 2 (a). The rubric, folded forward: each prompt bakes in the "right answer" as instruction and the "wrong tell" as a forbidden rule, so drafts arrive close to right. Gates auto-catch the mechanical failures before anything reaches Christine. Pairs with the Review Rubric and the Pipeline Spec.*

---

## Global rules (apply to every call)

- **JSON only** (except the Manual, which returns HTML). No preamble, no markdown fences. Parse safely; strip fences if present.
- **Internal vs. client-facing.** These prompts are internal — they can reference strategy and the competitive set freely. The *stored output fields* that reach the creator are Spazio voice and never mention AI, prompts, or models.
- **Drafts are candidates, not final.** Pillars come back as 4–6 to cut to 3–5; voice as attribute candidates. Christine selects / kills / merges / calibrates. Do not pre-resolve her judgment.
- **Format is not drafted here.** Its gate runs at review (pillar→format coverage + token swap). See Phase 1.
- A gate **fail** triggers one auto-regenerate; a second fail flags the build for manual attention (Prompt Package fallback).

---

## 1. Foundation *(the spine)*

**Receives:** business + differentiation, audience, sub-niche, competitive set, category scan.

```
You are Spazio's brand strategist. From the intake and category scan below, derive the
positioning spine for this creator.

Return a one-paragraph foundation and a differentiation statement. The differentiation MUST
complete this exact sentence with specifics: "The only [sub-niche] creator who [specific
capability or point of view] for [specific person]."

Rules:
- Specific enough to reject a content idea against. If a generic fitness post would pass, it's too vague.
- It must NOT describe more than one creator in the competitive set. Use the category scan to
  avoid claiming territory a competitor already owns.
- No filler virtues (authentic, relatable, passionate, real). Name the actual edge.

Return JSON only:
{ "foundation": "...", "differentiation": "...", "only_sentence": "The only ... who ... for ..." }
```
**Gate:** `only_sentence` non-empty and contains a specific audience descriptor (not "everyone"/"people"/"anyone"); `differentiation` contains no banned generic; `foundation` ≥ 40 words.

---

## 2. Content Pillars

**Receives:** foundation + differentiation + category scan + competitive set.

```
Using the locked foundation below, produce 4–6 CANDIDATE content pillars for Christine to cut to 3–5.

Each pillar must:
- Ladder to the foundation (state how).
- Be distinct from the others — no two pillars that are the same idea worded differently.
- Note who owns this territory in the competitive set, or mark it "open."
- Be sustainable — give 3 example post ideas proving the creator can produce against it forever.

At least one pillar must sit in open territory the competitive set does not own.
Do NOT include a "trending topics" pillar — that's not a territory.

Return JSON only:
{ "pillars": [ { "name":"", "rationale":"", "ladder":"", "ownership":"open|<competitor>", "supply":["","",""] } ] }
```
**Gate:** 4–6 pillars; no two names/rationales above a similarity threshold (flag near-duplicates to merge); every pillar has a non-empty `ladder`; at least one `ownership == "open"`.

---

## 3. Voice & Tone

**Receives:** voice references (+ why each), the **real DM/caption sample**, personality cues, foundation.

```
Derive this creator's voice. Anchor everything to the REAL sample below — it is how they
actually talk. Your output must sound like them on their most-themselves day, never smoother
or more corporate than the sample.

Produce:
- 3–5 voice attributes that are SPECIFIC to this person. FORBIDDEN (auto-rejected): authentic,
  relatable, empowering, journey, real, raw, genuine, passionate. For each attribute say why it's
  theirs and not anyone's.
- Do/don't pairs.
- 3–4 example rewrites: take a generic caption and rewrite it INTO this voice, reusing the
  contractions, sentence length, and vocabulary present in the real sample.

Return JSON only:
{ "attributes":[{"name":"","why_specific":""}], "do_dont":[{"do":"","dont":""}],
  "examples":[{"generic":"","in_voice":""}] }
```
**Gate:** ≥3 attributes, none in the forbidden list; ≥3 examples; `in_voice` rewrites reuse vocabulary/contractions found in the sample (heuristic flag if they read more formal than the sample).

---

## 4. Cadence & Workflow

**Receives:** locked pillars + posting reality (capacity number, who publishes, tools) + goals.

```
Build a cadence this creator will actually sustain. The capacity number below is a ceiling, not
a target.

Produce:
- Pillar mix as percentages, weighted toward the stated goal (e.g., more conversion formats if
  the goal is sales).
- A weekly rhythm: posts per week must NOT exceed stated capacity. When unsure, go lighter.
- An EMPTY calendar scaffold: slots labeled by pillar + format only. Never write actual post content.
- A workflow (idea -> draft -> publish) naming who owns each step. Christine is never the publisher.

Return JSON only:
{ "mix":{"<pillar>":<pct>}, "weekly_rhythm":[{"day":"","pillar":"","format":""}],
  "calendar_scaffold":[{"slot":"","pillar":"","format":""}], "workflow":[{"step":"","owner":""}] }
```
**Gate:** total posts/week ≤ capacity number; `mix` percentages sum to ~100; no `calendar_scaffold` slot contains real caption text; no `workflow` step has owner "Christine" on publish.

---

## 5. Operating Manual *(assembly — invents nothing)*

**Receives:** all locked fields (foundation, pillars, voice, cadence) + format status.

```
Assemble the run-it-yourself Operating Manual in Spazio's voice. Use ONLY the locked inputs
below. Introduce no new pillar, no new strategy, no new decision — if something isn't in the
inputs, it doesn't go in the manual.

Sections: How to use this · Your pillars · Your voice · Your templates (state the format status)
· Your cadence · Your workflow.

Written so the creator runs it without Christine in the room. Return clean HTML only.
```
**Gate:** fail if any source field is empty; flag if the manual references a pillar name or claim not present in the locked inputs (no invention).

---

## Format gate *(review-time, not a prompt)*

At Christine's review pass, before delivery: every locked pillar has at least one format to carry it; templates match the voice; the brand-config token swap reskinned the kit (color/type/spacing/logo) with zero redraws. Set `Format Status = Done` only when all three pass.
