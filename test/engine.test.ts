import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THRESHOLDS, evidence, verdict, score, tally, applies } from '../src/lib/engine.ts';

test('thresholds are the recovered values', () => {
  assert.equal(THRESHOLDS.reported, 0.7);
  assert.equal(THRESHOLDS.missing, 0.35);
  assert.equal(THRESHOLDS.gate, 0.6);
});

// 1 - p is not exact in binary floating point (1 - 0.9 === 0.09999999999999998), so inversion
// is asserted within a tolerance. The engine is right; exact equality was the wrong assertion.
const close = (a: number, b: number, eps = 1e-12) => Math.abs(a - b) < eps;

test('a warning-sign check inverts its evidence', () => {
  assert.ok(close(evidence(0.9, 'flag'), 0.1));
  assert.equal(evidence(0.9, 'good'), 0.9);
  assert.ok(close(evidence(0.25, 'flag'), 0.75));
  assert.ok(close(evidence(0, 'flag'), 1));
});

test('verdicts sit on the recovered boundaries', () => {
  assert.equal(verdict(0.7), 'reported');
  assert.equal(verdict(0.699999), 'unclear');
  assert.equal(verdict(0.35), 'unclear');
  assert.equal(verdict(0.349999), 'missing');
});

test('a warning-sign check reports the opposite way round', () => {
  assert.equal(verdict(0.9, 'flag'), 'warning');    // the problem is clearly present
  assert.equal(verdict(0.1, 'flag'), 'not-seen');   // looked for, not found
  assert.equal(verdict(0.5, 'flag'), 'unclear');
});

test('probability out of range is refused, not clamped', () => {
  assert.throws(() => evidence(1.2), RangeError);
  assert.throws(() => evidence(-0.1), RangeError);
  assert.throws(() => evidence(NaN), RangeError);
});

test('score is 0-100 and rounds', () => {
  assert.equal(score([{ id: 'a', p: 0.8 }, { id: 'b', p: 0.6 }]), 70);
  assert.equal(score([{ id: 'a', p: 1 }]), 100);
});

test('an empty set scores null rather than zero', () => {
  assert.equal(score([]), null);
});

test('tally buckets warning-sign checks correctly', () => {
  const t = tally([
    { id: 'a', p: 0.9 },              // reported
    { id: 'b', p: 0.5 },              // unclear
    { id: 'c', p: 0.1 },              // missing
    { id: 'd', p: 0.05, polarity: 'flag' }, // not-seen -> good
    { id: 'e', p: 0.95, polarity: 'flag' }, // warning -> bad
  ]);
  assert.deepEqual(t, { good: 2, unclear: 1, bad: 2 });
});

test('a check with no module always applies', () => {
  assert.equal(applies(undefined, []), true);
  assert.equal(applies([], []), true);
});

test('the gate opens at the threshold and not below it', () => {
  assert.equal(applies('animals', [{ type: 'animals', confidence: 0.6 }]), true);
  assert.equal(applies('animals', [{ type: 'animals', confidence: 0.599 }]), false);
  assert.equal(applies('animals', []), false);
  assert.equal(applies(['cells', 'omics'], [{ type: 'omics', confidence: 0.9 }]), true);
});
