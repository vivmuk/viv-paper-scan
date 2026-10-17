import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingSteps, recognisedTypes, stepsDone, elapsedLabel, paceRemaining, remainingLabel, silentFor } from '../src/lib/progress.ts';
import type { ScanSession } from '../src/lib/scan-client.ts';

const base = (over: Partial<ScanSession> = {}): ScanSession => ({
  paper: { title: 'A paper' }, paragraphs: [], detections: null, answers: {}, picks: {},
  domains: [], notes: [], status: 'scanning', ...over,
});

test('before anything arrives the study-type step is the one being read and the six domains wait', () => {
  const steps = readingSteps(base(), null);
  assert.equal(steps.length, 7);
  assert.equal(steps[0].title, 'Study type');
  assert.equal(steps[0].state, 'reading');
  assert.deepEqual(steps.slice(1).map((step) => step.state), Array(6).fill('waiting'));
  assert.deepEqual(steps.slice(1).map((step) => step.numeral), ['I', 'II', 'III', 'IV', 'V', 'VI']);
});

test('a domain is only marked read when its own pass has arrived, and the next one is then being read', () => {
  const session = base({ detections: [{ type: 'animals', confidence: 0.9 }], domains: ['design', 'stats'] });
  const steps = readingSteps(session, null);
  assert.equal(steps[0].state, 'read');
  assert.equal(steps[1].state, 'read');
  assert.equal(steps[2].state, 'read');
  assert.equal(steps[3].state, 'reading', 'the third domain is the one now being read');
  assert.equal(steps[4].state, 'waiting');
  assert.equal(stepsDone(session), 3);
});

test('study types are named only at the published gate, never on a weak reading', () => {
  const session = base({ detections: [
    { type: 'animals', confidence: 0.93 }, { type: 'cells', confidence: 0.71 },
    { type: 'humans', confidence: 0.58 }, { type: 'trial', confidence: 0.12 },
  ] });
  assert.deepEqual(recognisedTypes(session), ['animal work', 'cell lines']);
  assert.match(readingSteps(session, null)[0].detail ?? '', /animal work · cell lines/);
});

test('a paper the scan cannot classify says so rather than inventing a type', () => {
  const steps = readingSteps(base({ detections: [{ type: 'trial', confidence: 0.2 }] }), null);
  assert.match(steps[0].detail ?? '', /only the universal enquiries apply/);
});

test('nothing is described as read once the scan is finished or has failed', () => {
  const steps = readingSteps(base({ status: 'error' }), null);
  assert.equal(steps[0].state, 'waiting');
  assert.equal(stepsDone(base({ status: 'error' })), 0);
});

test('the elapsed clock speaks in seconds and then in minutes', () => {
  assert.equal(elapsedLabel(0), '0 s');
  assert.equal(elapsedLabel(47_400), '47 s');
  assert.equal(elapsedLabel(72_000), '1 min 12 s');
  assert.equal(elapsedLabel(120_000), '2 min');
});

test('no estimate is offered before there is a pace to measure', () => {
  assert.equal(paceRemaining([], 6, 0), null, 'nothing has arrived');
  assert.equal(paceRemaining([1000], 6, 2000), null, 'one arrival is not a pace');
  assert.equal(paceRemaining([1000, 1000], 6, 2000), null, 'a zero gap is not a pace either');
});

test('the estimate is the observed mean gap times the steps still to come', () => {
  const arrivals = [0, 10_000, 20_000, 30_000];
  assert.equal(paceRemaining(arrivals, 3, 31_000), 30_000);
  assert.equal(paceRemaining(arrivals, 0, 31_000), 0);
});

test('the estimate is stated coarsely and never as false precision', () => {
  assert.equal(remainingLabel(20_000), 'about half a minute left');
  assert.equal(remainingLabel(70_000), 'about a minute left');
  assert.equal(remainingLabel(150_000), 'about 3 min left');
});

test('silence is measured from the last thing that actually arrived', () => {
  const session = base({ startedAt: 1_000, arrivals: [4_000, 9_000] });
  assert.equal(silentFor(session, 20_000), 11_000);
  assert.equal(silentFor(base({ startedAt: 1_000 }), 20_000), 19_000, 'before any arrival, from the start');
  assert.equal(silentFor(base({ status: 'complete', startedAt: 1_000 }), 20_000), null);
});
