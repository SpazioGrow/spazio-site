// lib/ad-set/services.ts
// External IO: Perplexity (sonar), OpenAI (gpt-4o JSON), Airtable record writes.
// Airtable writes use field IDs; typecast is never used.

import {
  BASE_ID, LEADS_TABLE_ID, LEADS, AD_SETS_TABLE_ID, AD_CONCEPTS_TABLE_ID, ADSET, CONCEPT,
} from './fields';
import type { Position, Concept } from './prompts';

// ---- AI -------------------------------------------------------------------
export async function perplexity(prompt: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`perplexity ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

export async function openaiJSON<T = any>(prompt: string): Promise<T> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const raw = (json.choices?.[0]?.message?.content ?? '{}').replace(/```json|```/g, '').trim();
  return JSON.parse(raw) as T;
}

// ---- Airtable -------------------------------------------------------------
const AT = `https://api.airtable.com/v0/${BASE_ID}`;
const headers = () => ({
  Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
  'Content-Type': 'application/json',
});

async function atCreate(tableId: string, fields: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${AT}/${tableId}`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ records: [{ fields }] }), // no typecast
  });
  if (!res.ok) throw new Error(`airtable create ${tableId} ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.records[0].id as string;
}

async function atUpdate(tableId: string, recordId: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${AT}/${tableId}/${recordId}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`airtable update ${tableId} ${res.status}: ${await res.text()}`);
}

export const createLead = (p: { email: string; firstName?: string; source: string }) =>
  atCreate(LEADS_TABLE_ID, {
    [LEADS.EMAIL]: p.email,
    [LEADS.FIRST_NAME]: p.firstName ?? '',
    [LEADS.SOURCE]: p.source,
  });

export const createAdSet = (p: {
  leadId: string; brandName: string; offer?: string; destinationUrl?: string;
  claimGuardrails?: string; brandConfig: string; status: string;
}) => atCreate(AD_SETS_TABLE_ID, {
  [ADSET.BRAND_NAME]: p.brandName,
  [ADSET.LEAD]: [p.leadId],
  [ADSET.OFFER]: p.offer ?? '',
  [ADSET.DESTINATION]: p.destinationUrl ?? '',
  [ADSET.GUARDRAILS]: p.claimGuardrails ?? '',
  [ADSET.BRAND_CONFIG]: p.brandConfig,
  [ADSET.STATUS]: p.status,
});

export const setStatus = (adSetId: string, status: string) =>
  atUpdate(AD_SETS_TABLE_ID, adSetId, { [ADSET.STATUS]: status });

export const writePosition = (adSetId: string, brief: string, position: Position) =>
  atUpdate(AD_SETS_TABLE_ID, adSetId, {
    [ADSET.MARKET_BRIEF]: brief,
    [ADSET.POSITION]: JSON.stringify(position, null, 2),
    [ADSET.INEVITABLE]: position.scores.inevitable,
    [ADSET.INSIDER]: position.scores.insider,
    [ADSET.EFFORTLESS]: position.scores.effortless,
    [ADSET.STATUS]: 'Ready for Review',
  });

export const createAdConcept = (adSetId: string, c: Concept) =>
  atCreate(AD_CONCEPTS_TABLE_ID, {
    [CONCEPT.CONCEPT]: `${c.angle} — ${c.headline}`.slice(0, 100),
    [CONCEPT.AD_SET]: [adSetId],
    [CONCEPT.ANGLE]: c.angle,
    [CONCEPT.PRIMARY]: c.primary_text,
    [CONCEPT.HEADLINE]: c.headline,
    [CONCEPT.VISUAL]: c.visual_direction,
    [CONCEPT.PROOF]: c.proof_used,
    [CONCEPT.CLAIM]: c.claim_check,
    [CONCEPT.STATUS]: 'Draft',
  });
