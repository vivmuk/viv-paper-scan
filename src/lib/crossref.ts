/**
 * Crossref: what the register says about an identifier.
 *
 * This lives here rather than in the route file for a concrete reason — a Next.js route may only
 * export its handlers and a few reserved fields, so helper functions exported from route.ts break
 * the production build outright ("not a valid Route export field"). The logic belongs in the library
 * anyway, where it can be tested without standing up a request.
 *
 * No judgement happens here. Crossref is the register of record for both resolution and notices, so
 * a retraction or correction appears in its update-to field and we report what it says. If the
 * register is silent, we say so.
 *
 * Crossref asks callers to identify themselves for its polite pool; CROSSREF_MAILTO supplies that
 * and is optional, but a missing value means we may be served more slowly.
 */

export interface UpdateNotice {
  type: string;
  doi: string;
  date?: string;
}

export interface DoiRecord {
  found: boolean;
  title?: string;
  year?: number;
  updates?: UpdateNotice[];
  error?: string;
}

const DOI_SHAPE = /^10\.\d{4,9}\/\S+$/;

export function looksLikeDoi(value: string): boolean {
  return DOI_SHAPE.test(value.trim());
}

export function bareDoi(value: string): string {
  return value.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
}

export async function fetchDoi(doi: string, fetchImpl: typeof fetch = fetch): Promise<DoiRecord> {
  const clean = bareDoi(doi);
  if (!looksLikeDoi(clean)) return { found: false, error: 'not a DOI' };
  const mailto = process.env.CROSSREF_MAILTO;
  const url = `https://api.crossref.org/works/${encodeURIComponent(clean)}${mailto ? `?mailto=${encodeURIComponent(mailto)}` : ''}`;
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
        'user-agent': `viv-paper-scan/0.1${mailto ? ` (mailto:${mailto})` : ''}`,
      },
    });
    if (response.status === 404) return { found: false };
    if (!response.ok) return { found: false, error: `crossref returned ${response.status}` };
    const payload = (await response.json()) as {
      message?: {
        title?: string[];
        issued?: { 'date-parts'?: number[][] };
        'update-to'?: Array<{ type?: string; DOI?: string; updated?: { 'date-parts'?: number[][] } }>;
      };
    };
    const message = payload.message ?? {};
    const year = message.issued?.['date-parts']?.[0]?.[0];
    const updates = (message['update-to'] ?? [])
      .filter((u) => u?.type && u?.DOI)
      .map((u) => ({
        type: String(u.type),
        doi: String(u.DOI),
        date: u.updated?.['date-parts']?.[0]?.join('-'),
      }));
    return {
      found: true,
      title: message.title?.[0],
      ...(typeof year === 'number' ? { year } : {}),
      updates,
    };
  } catch (err) {
    return { found: false, error: `could not reach crossref: ${(err as Error).message}` };
  }
}
