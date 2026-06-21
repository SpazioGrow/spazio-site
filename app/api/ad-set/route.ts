// app/api/ad-set/route.ts
import { waitUntil } from '@vercel/functions';
import {
  AD_RESEARCH, AD_POSITION, AD_CONCEPTS,
  positionGatePasses, conceptsGatePasses,
  type Position, type Concept,
} from '@/lib/ad-set/prompts';
import {
  perplexity, openaiJSON,
  createLead, createAdSet, setStatus, writePosition, createAdConcept,
} from '@/lib/ad-set/services';

export const runtime = 'nodejs';
export const maxDuration = 300; // requires Vercel Pro — research + 2 GPT-4o calls run sequentially

export async function POST(req: Request) {
  const {
    firstName, email, brandName, offer, destinationUrl,
    claimGuardrails, brandConfig, proofAssets,
  } = await req.json();

  if (!email || !brandName || !brandConfig) {
    return Response.json({ ok: false, error: 'missing required fields' }, { status: 400 });
  }

  // 1. FAST WRITES — Lead + Ad Set (Queued)
  const leadId  = await createLead({ email, firstName, source: 'Positioned Ad Set' });
  const adSetId = await createAdSet({
    leadId, brandName, offer, destinationUrl, claimGuardrails,
    brandConfig: JSON.stringify(brandConfig), status: 'Queued',
  });

  // 2. RUN THE CHAIN AFTER RESPONDING
  waitUntil(runAdSet({ adSetId, brandName, offer, claimGuardrails, brandConfig, proofAssets }));

  // 3. return immediately → "We're on it"
  return Response.json({ ok: true });
}

async function runAdSet(p: {
  adSetId: string; brandName: string; offer?: string;
  claimGuardrails?: string; brandConfig: unknown; proofAssets?: unknown;
}) {
  const { adSetId, brandName, offer = '', claimGuardrails = '', brandConfig, proofAssets } = p;
  try {
    await setStatus(adSetId, 'Researching');

    // a. territory brief
    const brief = await perplexity(AD_RESEARCH({ brandName, offer }));

    // b. position (+ one auto-regenerate on gate fail)
    await setStatus(adSetId, 'Drafting');
    let position = await openaiJSON<Position>(AD_POSITION({ brief, brandConfig, offer }));
    if (!positionGatePasses(position)) {
      position = await openaiJSON<Position>(AD_POSITION({ brief, brandConfig, offer }));
      if (!positionGatePasses(position)) return setStatus(adSetId, 'Failed');
    }

    // c. concepts (+ one auto-regenerate on gate fail)
    let concepts = await openaiJSON<{ concepts: Concept[] }>(
      AD_CONCEPTS({ position, brandConfig, proofAssets, claimGuardrails }),
    );
    if (!conceptsGatePasses(concepts, position)) {
      concepts = await openaiJSON<{ concepts: Concept[] }>(
        AD_CONCEPTS({ position, brandConfig, proofAssets, claimGuardrails }),
      );
      if (!conceptsGatePasses(concepts, position)) return setStatus(adSetId, 'Failed');
    }

    // d. land position on the Ad Set, fan concepts into child records
    await writePosition(adSetId, brief, position);
    for (const c of concepts.concepts) await createAdConcept(adSetId, c);
  } catch (err) {
    await setStatus(adSetId, 'Failed'); // visible in Airtable, never silent
    console.error('ad-set chain failed', err);
  }
}
