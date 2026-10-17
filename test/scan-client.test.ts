import test from 'node:test';
import assert from 'node:assert/strict';
import { readScanStream, presentScan, applyScanEvent, createSession } from '../src/lib/scan-client.ts';

test('NDJSON handles arbitrary byte boundaries, UTF-8, CRLF, and a final unterminated line', async () => {
  const source = new TextEncoder().encode('{"type":"note","message":"café"}\r\n\n{"type":"done","checks":0}');
  const stream = new ReadableStream({ start(controller) { for (const byte of source) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
  const events: unknown[] = [];
  await readScanStream(new Response(stream), e => events.push(e));
  assert.deepEqual(events, [{ type: 'note', message: 'café' }, { type: 'done', checks: 0 }]);
});

test('stream errors, bad JSON, invalid percentages, HTTP errors, and truncated scans are explicit failures', async () => {
  for (const [body, message] of [
    ['{"type":"note","message":"partial"}\n', /ended before/],
    ['not json\n', /unreadable JSON/],
    ['{"type":"error","message":"Quota exceeded"}\n', /Quota exceeded/],
    ['{"type":"domain","domain":"design","checks":[{"id":"hypothesis","p":150,"where":[]}]}\n', /invalid event/],
  ] as const) await assert.rejects(readScanStream(new Response(body), () => {}), message);
  await assert.rejects(readScanStream(new Response('{"error":"API unavailable"}', { status: 503 }), () => {}), /API unavailable/);
});

test('server-located offsets survive into the source passage and warning polarity inverts once', () => {
  let session = createSession({ title: 'Paper' }, [{ id: 'P1', page: 7, section: 'Discussion', text: 'prefix exact quotation suffix' }]);
  session = applyScanEvent(session, { type: 'detections', detections: [] });
  session = applyScanEvent(session, { type: 'domain', domain: 'claims', checks: [{ id: 'causal_overreach', p: 95, where: [{ para: 'P1', weight: 1 }] }] });
  session = applyScanEvent(session, { type: 'sentences', picks: { causal_overreach: { para: 'P1', start: 7, end: 22, quote: 'exact quotation' } } });
  const result = presentScan(session).checks.find(c => c.id === 'causal_overreach')!;
  assert.equal(result.state, 'warning');
  assert.ok(Math.abs(result.evidence - 0.05) < 1e-12);
  assert.deepEqual(result.passage, { para: 'P1', start: 7, end: 22, quote: 'exact quotation', section: 'Discussion', page: 7 });
  assert.equal(session.paragraphs[0].text.slice(result.passage!.start, result.passage!.end), 'exact quotation');
});

test('an aborted stream cannot be mistaken for a complete scan', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(readScanStream(new Response('{"type":"done","checks":0}'), () => {}, controller.signal), { name: 'AbortError' });
});

// A single wire percentage must cross the boundary once, with canonical polarity and gates.
test('live presentation uses streamed percentages, gates, and no invented evidence', async () => {
  const { createSession, applyScanEvent, presentScan } = await import('../src/lib/scan-client.ts');
  let session = createSession({ title: 'A real paper' }, [{ id: 'P001', section: 'Methods', text: 'The hypothesis was stated in advance.', page: 2 }]);
  session = applyScanEvent(session, { type: 'detections', detections: [{ type: 'empirical', confidence: 0.9 }] });
  session = applyScanEvent(session, { type: 'domain', domain: 'design', checks: [{ id: 'hypothesis', p: 90, where: [] }, { id: 'primary_outcome', p: 99, where: [], evidenceMissing: true }] });
  const scan = presentScan(session);
  assert.equal(scan.index, 90);
  assert.equal(scan.counters.good, 1);
  assert.equal(scan.counters.bad, 0);
  assert.equal(scan.checks.find(c => c.id === 'hypothesis')?.evidence, 0.9);
  assert.equal(scan.checks.find(c => c.id === 'hypothesis')?.passage, undefined);
  assert.equal(scan.checks.find(c => c.id === 'primary_outcome')?.state, 'unanswered');
  assert.equal(scan.checks.find(c => c.id === 'cell_authentication')?.state, 'not-applicable');
  assert.equal(scan.checks.find(c => c.id === 'effect_size')?.state, 'pending');
});
