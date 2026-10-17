/**
 * POST /api/lookup — what the registers say about a paper's identifiers.
 *
 * The logic lives in src/lib/crossref.ts, because a Next.js route file may only export its handler
 * and a few reserved fields: exporting a helper from here fails the production build outright with
 * "not a valid Route export field".
 */

import { fetchDoi, type DoiRecord } from '../../../lib/crossref.ts';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  let body: { dois?: unknown };
  try {
    body = (await request.json()) as { dois?: unknown };
  } catch {
    return Response.json({ error: 'expected a JSON body' }, { status: 400 });
  }

  const raw = Array.isArray(body.dois) ? body.dois : [];
  const dois = [...new Set(raw.filter((d): d is string => typeof d === 'string' && d.trim() !== ''))].slice(0, 200);

  const crossref: Record<string, DoiRecord> = {};
  // Small batches: Crossref is a shared public service and we are a guest on it.
  const batch = 5;
  for (let i = 0; i < dois.length; i += batch) {
    const slice = dois.slice(i, i + batch);
    const settled = await Promise.all(slice.map((doi) => fetchDoi(doi)));
    slice.forEach((doi, index) => {
      crossref[doi] = settled[index];
    });
  }

  return Response.json(
    { checkedAt: new Date().toISOString(), crossref },
    { headers: { 'cache-control': 'no-store' } },
  );
}
