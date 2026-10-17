/**
 * POST /api/scan — the scan, streamed.
 *
 * The browser parses the PDF and sends only section-tagged paragraphs, one per line of JSON coming
 * back. Streaming matters for two reasons: a scan takes tens of seconds, and the reader should see
 * each domain settle as it is answered rather than watching a spinner. The Venice key stays here,
 * server-side, and is never part of the response.
 */

import { scanPaper, type Paragraph } from '../../../lib/scan.ts';
import { VeniceError } from '../../../lib/venice.ts';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_PARAGRAPHS = 4000;
const MAX_CHARS = 2_000_000;

function readParagraphs(value: unknown): Paragraph[] | string {
  if (!Array.isArray(value)) return 'expected a "paragraphs" array';
  if (value.length === 0) return 'the paper had no readable text';
  if (value.length > MAX_PARAGRAPHS) return `too many paragraphs (${value.length}); the limit is ${MAX_PARAGRAPHS}`;
  let chars = 0;
  const out: Paragraph[] = [];
  for (const raw of value) {
    const p = raw as Partial<Paragraph>;
    if (typeof p?.id !== 'string' || typeof p?.text !== 'string' || p.text.trim() === '') {
      return 'every paragraph needs a string id and non-empty text';
    }
    chars += p.text.length;
    out.push({ id: p.id, section: typeof p.section === 'string' ? p.section : 'unsectioned', text: p.text });
  }
  if (chars > MAX_CHARS) return `the paper is too long (${chars} characters); the limit is ${MAX_CHARS}`;
  return out;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'expected a JSON body' }, { status: 400 });
  }

  const paragraphs = readParagraphs((body as { paragraphs?: unknown })?.paragraphs);
  if (typeof paragraphs === 'string') return Response.json({ error: paragraphs }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      try {
        for await (const event of scanPaper(paragraphs)) send(event);
      } catch (err) {
        // A failure is reported as a line in the stream rather than a broken connection, so the
        // reader learns what went wrong instead of seeing the page stop.
        const message =
          err instanceof VeniceError
            ? err.message
            : `The scan stopped: ${(err as Error).message ?? 'unknown error'}`;
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  });
}
