/**
 * GET /api/catalogue — the enquiries, published.
 *
 * The whole point of a reporting checklist is that a reader can audit it, so this endpoint returns
 * every enquiry with its domain, its guideline provenance and its study-type gate. It also returns
 * the thresholds, because a score is meaningless without the rules that produced it.
 */

import { CATALOGUE } from '../../../lib/catalogue.ts';
import { THRESHOLDS } from '../../../lib/engine.ts';
import { STUDY_TYPES } from '../../../lib/scan.ts';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const payload = {
    count: CATALOGUE.length,
    thresholds: {
      reported: THRESHOLDS.reported,
      missing: THRESHOLDS.missing,
      gate: THRESHOLDS.gate,
      explanation:
        'Evidence at or above "reported" counts as present; below "missing" counts as absent; ' +
        'between the two the answer is unclear. A study type must be detected at or above "gate" ' +
        'for its gated enquiries to be asked at all. Four warning-sign enquiries invert, so a high ' +
        'probability there means the problem is present.',
    },
    studyTypes: STUDY_TYPES,
    checks: CATALOGUE.map((c) => ({
      id: c.id,
      domain: c.domain,
      question: c.question,
      guidelines: c.guidelines,
      gate: c.module ?? null,
      polarity: c.polarity,
      provenance: c.provenance,
    })),
    provenance: {
      wording: 'Every enquiry here is this project own composition, not copied from any other tool.',
      upstream: 'Derived from published reporting guidelines, principally ARRIVE 2.0 (NC3Rs).',
      disclaimer: 'Not affiliated with, or endorsed by, K-Dense.',
    },
  };
  return Response.json(payload, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
