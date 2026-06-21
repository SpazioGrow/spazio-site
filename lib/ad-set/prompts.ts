// lib/ad-set/prompts.ts
// The three prompts + the two gates. The "right answer" is baked into each
// prompt as instruction; the gate catches the mechanical failures before
// anything reaches Christine. Outputs read as Spazio — AI invisible.

export type Angle = { name: string; ladder: string; ownership: string };
export type Position = {
  position: string; who_for: string; promise: string; proof: string;
  angles: Angle[];
  scores: { inevitable: number; insider: number; effortless: number };
};
export type Concept = {
  angle: string; primary_text: string; headline: string;
  visual_direction: string; proof_used: string; claim_check: string;
};

const BANNED = [
  'authentic', 'elevated', 'clean', 'modern', 'premium',
  'real', 'empowering', 'genuine', 'passionate', 'relatable',
];

const has = (s: string, terms: string[]) =>
  terms.some(t => (s || '').toLowerCase().includes(t));

const GENERIC_AUDIENCE = /^\s*(everyone|anyone|people|all|customers)\s*$/i;

// ---------------------------------------------------------------------------
// a. Perplexity research — the territory
// ---------------------------------------------------------------------------
export const AD_RESEARCH = ({ brandName, offer }: { brandName: string; offer: string }) =>
`Research the paid-marketing landscape for the brand "${brandName}", which sells
"${offer}", and its category. Cover: where competitors cluster in their paid messaging
and angles, which claims are table-stakes vs. genuinely differentiating, and where the
open positioning territory sits that nobody is running. Return a tight context brief,
no preamble.`;

// ---------------------------------------------------------------------------
// b. Position — the spine (GPT-4o JSON)
// ---------------------------------------------------------------------------
export const AD_POSITION = (
  { brief, brandConfig, offer }: { brief: string; brandConfig: unknown; offer: string },
) =>
`You are Spazio's brand strategist. From the territory brief, the brand-config, and the
offer below, derive the marketing POSITION this ad set will express. Judge it against
Spazio's filter: Inevitable, Insider, Effortless.

Produce:
- A one-paragraph position specific enough to REJECT an ad concept against. If a generic
  ad in this category would pass it, it's too vague.
- who_for: a specific person, not "everyone".
- The core promise and the single strongest proof point behind it.
- 3–4 ad ANGLES that each ladder to the position. For each: name, why it ladders, and
  whether the territory is "open" or owned by a competitor. At least one angle must sit
  in open territory.

Rules:
- No filler virtues (authentic, elevated, clean, modern, premium, real, empowering). Name the real edge.
- The position must not describe three other brands in the category. Use the brief to avoid
  claiming territory a competitor already owns.

Offer: ${offer}

Brand-config:
${JSON.stringify(brandConfig)}

Territory brief:
${brief}

Return JSON only:
{
  "position": "...",
  "who_for": "...",
  "promise": "...",
  "proof": "...",
  "angles": [ { "name": "", "ladder": "", "ownership": "open|<competitor>" } ],
  "scores": { "inevitable": 1-5, "insider": 1-5, "effortless": 1-5 }
}`;

export function positionGatePasses(p: Position): boolean {
  const reasons: string[] = [];
  const words = (p?.position || '').trim().split(/\s+/).filter(Boolean).length;
  if (words < 40) reasons.push('position < 40 words');
  if (!p?.who_for || GENERIC_AUDIENCE.test(p.who_for)) reasons.push('who_for missing/generic');
  if (has(p?.position, BANNED) || has(p?.promise, BANNED)) reasons.push('banned filler virtue');
  if (!Array.isArray(p?.angles) || p.angles.length < 3) reasons.push('< 3 angles');
  else {
    if (p.angles.some(a => !a.ladder?.trim())) reasons.push('angle missing ladder');
    if (!p.angles.some(a => (a.ownership || '').toLowerCase() === 'open')) reasons.push('no open-territory angle');
  }
  const s = p?.scores;
  if (!s || [s.inevitable, s.insider, s.effortless].some(n => typeof n !== 'number')) reasons.push('scores missing');
  if (reasons.length) console.warn('[ad-set] position gate fail:', reasons.join('; '));
  return reasons.length === 0;
}

// ---------------------------------------------------------------------------
// c. Concepts — the candidates (GPT-4o JSON)
// ---------------------------------------------------------------------------
export const AD_CONCEPTS = (
  { position, brandConfig, proofAssets, claimGuardrails, n = 16 }:
  { position: Position; brandConfig: unknown; proofAssets: unknown; claimGuardrails: string; n?: number },
) =>
`Using the LOCKED position and angles below, produce ${n} CANDIDATE ad concepts for Christine
to cut. Spread them across the named angles — do not pile them all on one.

Each concept must:
- angle: which angle it expresses (must be one of the locked angle names — invent no new angle).
- Express the POSITION, not a competitor's ad. If it reads like a concept any brand in the
  category could run, cut it.
- primary_text and headline in the locked voice from the brand-config.
- visual_direction: what the creative shows, referencing brand-config ROLES
  (primary/accent/surface, heading/body) — never a raw hex or font name.
- proof_used: which proof asset it leans on, or "none".
- claim_check: begin with "OK — <why it's compliant>" if the copy stays inside the guardrails,
  or "VIOLATION — <what banned claim it would need>" if a compliant version isn't possible.
  Never emit a concept whose copy needs a banned claim; rewrite to compliant and mark OK.

Claim guardrails (HARD — never violate):
${claimGuardrails}

Locked position + angles:
${JSON.stringify(position)}

Brand-config:
${JSON.stringify(brandConfig)}

Proof assets:
${JSON.stringify(proofAssets)}

Return JSON only:
{ "concepts": [
  { "angle":"", "primary_text":"", "headline":"", "visual_direction":"",
    "proof_used":"", "claim_check":"" }
] }`;

export function conceptsGatePasses(
  data: { concepts: Concept[] },
  position: Position,
  bannedTerms: string[] = [],
): boolean {
  const reasons: string[] = [];
  const concepts = data?.concepts;
  if (!Array.isArray(concepts) || concepts.length < 3) { console.warn('[ad-set] concepts gate fail: < 3 concepts'); return false; }

  const angleNames = new Set(position.angles.map(a => a.name));
  const used = new Set<string>();
  const hex = /#[0-9a-fA-F]{3,8}\b/;

  for (const c of concepts) {
    if (!angleNames.has(c.angle)) reasons.push(`unknown angle: ${c.angle}`);
    else used.add(c.angle);
    const check = (c.claim_check || '').trim();
    if (!check || /^violation/i.test(check)) reasons.push('claim_check empty or VIOLATION');
    if (hex.test(c.visual_direction || '')) reasons.push('raw hex in visual_direction');
    if (bannedTerms.length && has(`${c.primary_text} ${c.headline}`, bannedTerms))
      reasons.push('banned term in copy');
  }
  if (used.size < Math.min(3, angleNames.size)) reasons.push('concepts span < 3 angles');

  if (reasons.length) console.warn('[ad-set] concepts gate fail:', [...new Set(reasons)].join('; '));
  return reasons.length === 0;
}
