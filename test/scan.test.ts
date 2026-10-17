import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaperText,
  clampPercent,
  detectStudyTypes,
  domainOrder,
  locateQuote,
  scanPaper,
} from '../src/lib/scan.ts';

process.env.VENICE_API_KEY = 'test-key-never-used';

// A miniature paper. The quotations used in the stub below are copied from these paragraphs,
// except one which is deliberately absent, to prove it is dropped rather than displayed.
const PAPER = [
  { id: 'P001', section: 'front', text: 'We asked whether the intervention improved the primary outcome.' },
  { id: 'P006', section: 'methods', text: 'Cell line identities were confirmed by short tandem repeat profiling (Cellbank, Australia). All lines were kept at 37 C.' },
  { id: 'P011', section: 'methods', text: 'Groups were allocated by a computer-generated sequence held off site.' },
];

const REAL_QUOTE = 'Cell line identities were confirmed by short tandem repeat profiling (Cellbank, Australia).';
const FABRICATED_QUOTE = 'The sample size was chosen in advance to give eighty per cent power to the main comparison.';

function reply(payload, status = 200, headerMap = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (n) => headerMap[n.toLowerCase()] ?? null },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

/** Answers whatever ids appear in the prompt, so the test does not hard-code the catalogue. */
function stubRouter() {
  const seen = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    const user = body.messages[body.messages.length - 1].content;
    seen.push(user);
    if (user.includes('"detections"')) {
      return reply({
        choices: [{ message: { content: JSON.stringify({ detections: [
          { type: 'empirical', confidence: 0.92 },
          { type: 'humans', confidence: 0.81 },
        ] }) } }],
      });
    }
    const ids = [...user.matchAll(/^- ([a-z_0-9]+):/gm)].map((m) => m[1]);
    const checks = {};
    for (const id of ids) {
      if (id === 'hypothesis') checks[id] = { p: 90, evidence: [{ para: 'P001', quote: 'We asked whether the intervention improved the primary outcome.' }] };
      else if (id === 'sample_size_rationale') checks[id] = { p: 12, evidence: [{ para: 'P011', quote: FABRICATED_QUOTE }] };
      else if (id === 'randomization') checks[id] = { p: 88, evidence: [{ para: 'P011', quote: 'Groups were allocated by a computer-generated sequence held off site.' }] };
      else checks[id] = { p: 55, evidence: [] };
    }
    return reply({ choices: [{ message: { content: JSON.stringify({ checks }) } }] });
  };
  return { fetchImpl, seen };
}

test('a quotation is found in the paper and its offsets come from our own search', () => {
  const found = locateQuote(REAL_QUOTE, PAPER[1].text);
  assert.ok(found);
  assert.equal(PAPER[1].text.slice(found.start, found.end), REAL_QUOTE);
  assert.equal(found.start, 0);
});

test('a quotation broken by different whitespace still locates, with offsets that stay valid', () => {
  const paragraph = 'Groups were allocated\n   by a computer-generated   sequence held off site.';
  const found = locateQuote('Groups were allocated by a computer-generated sequence held off site.', paragraph);
  assert.ok(found, 'collapsed whitespace should still be locatable');
  const slice = paragraph.slice(found.start, found.end);
  assert.equal(slice.replace(/\s+/g, ' '), 'Groups were allocated by a computer-generated sequence held off site.');
});

test('text that is absent, or too short to be a quotation, is refused', () => {
  assert.equal(locateQuote(FABRICATED_QUOTE, PAPER[1].text), null);
  assert.equal(locateQuote('too short', PAPER[1].text), null);
  assert.equal(locateQuote('', PAPER[1].text), null);
});

test('percentages outside the wire range are refused rather than clamped', () => {
  assert.equal(clampPercent(85), 85);
  assert.equal(clampPercent('85'), 85);
  assert.equal(clampPercent(85.6), 86);
  assert.equal(clampPercent(101), null);
  assert.equal(clampPercent(-1), null);
  assert.equal(clampPercent('high'), null);
  assert.equal(clampPercent(null), null);
});

test('the paper is joined with its paragraph ids so quotations can be traced back', () => {
  const text = buildPaperText(PAPER);
  assert.match(text, /\[P001\] \(front\)/);
  assert.match(text, /\[P006\] \(methods\)/);
  assert.ok(buildPaperText(PAPER, 40).length <= 120, 'the limit is respected');
});

test('detections are filtered to the nine known study types', async () => {
  const { fetchImpl } = stubRouter();
  const detections = await detectStudyTypes(PAPER, { fetchImpl });
  assert.deepEqual(detections.map((d) => d.type), ['empirical', 'humans']);
});

test('a scan emits detections, one event per domain, and a done line', async () => {
  const { fetchImpl } = stubRouter();
  const events = [];
  for await (const event of scanPaper(PAPER, { fetchImpl })) events.push(event);

  assert.equal(events[0].type, 'detections');
  assert.equal(events[events.length - 1].type, 'done');
  const domains = events.filter((e) => e.type === 'domain').map((e) => e.domain);
  assert.deepEqual(domains, domainOrder(), 'every domain with applicable enquiries is reported');
});

test('the quotation shown for an enquiry is the paper own text at the offsets given', async () => {
  const { fetchImpl } = stubRouter();
  const picks = {};
  for await (const event of scanPaper(PAPER, { fetchImpl })) {
    if (event.type === 'sentences') Object.assign(picks, event.picks);
  }
  assert.ok(picks.hypothesis, 'the enquiry with real evidence carries a pick');
  const pick = picks.hypothesis;
  assert.equal(pick.para, 'P001');
  assert.equal(PAPER[0].text.slice(pick.start, pick.end), pick.quote);
  assert.equal(pick.quote, 'We asked whether the intervention improved the primary outcome.');
});

test('a borrowed quotation that is not in the paper is dropped, never displayed', async () => {
  const { fetchImpl } = stubRouter();
  let events = [];
  for await (const event of scanPaper(PAPER, { fetchImpl })) events.push(event);

  const allPicks = {};
  for (const e of events) if (e.type === 'sentences') Object.assign(allPicks, e.picks);
  assert.equal(allPicks.sample_size_rationale, undefined, 'a quote we cannot find must not surface');

  const reported = events
    .filter((e) => e.type === 'domain')
    .flatMap((e) => e.checks)
    .find((c) => c.id === 'sample_size_rationale');
  assert.ok(reported, 'the enquiry is still reported, with a low probability');
  assert.equal(reported.p, 12);
  assert.equal(reported.where.length, 0, 'and with no evidence pointer at all');
});

test('an enquiry is not asked at all when its study type is absent from the paper', async () => {
  const { fetchImpl } = stubRouter();
  const asked = [];
  for await (const event of scanPaper(PAPER, { fetchImpl })) {
    if (event.type === 'domain') asked.push(...event.checks.map((c) => c.id));
  }
  // The stub detects only empirical and human work, so the cell-line enquiry must be gated out.
  assert.equal(asked.includes('cell_authentication'), false);
  assert.ok(asked.length > 20, 'the ungated enquiries are still asked');
});

test('an enquiry the model never answered is marked unanswered rather than scored zero', async () => {
  const fetchImpl = async (_url, init) => {
    const user = JSON.parse(init.body).messages.at(-1).content;
    if (user.includes('"detections"')) {
      return reply({ choices: [{ message: { content: '{"detections":[]}' } }] });
    }
    return reply({ choices: [{ message: { content: '{"checks":{}}' } }] });
  };
  const missing = [];
  for await (const event of scanPaper(PAPER, { fetchImpl })) {
    if (event.type === 'domain') missing.push(...event.checks.filter((c) => c.evidenceMissing).map((c) => c.id));
  }
  assert.ok(missing.length > 0, 'unanswered enquiries are flagged');
  assert.equal(missing.length, new Set(missing).size);
});
