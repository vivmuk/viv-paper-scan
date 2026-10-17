import test from 'node:test';
import assert from 'node:assert/strict';
import {
  grim, percentages, estimateInInterval,
  tPValue, zPValue, normalCdf, chiSquarePValue, fPValue, rPValue, comparePValue,
  recomputeStatistic,
} from '../src/lib/arithmetic.ts';

// NIST/SEMATECH e-Handbook, Student t table: two-tailed alpha = .05.
// https://itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
// Chi-square: https://itl.nist.gov/div898/handbook/eda/section3/eda3674.htm
// F: https://itl.nist.gov/div898/handbook/eda/section3/eda3673.htm
// Published critical values are rounded to three decimals; absolute p tolerance is 1e-4.
test('t tails match published critical values for 10 and 1 degrees of freedom', () => {
  close(tPValue(2.228, 10).p, 0.05);
  close(tPValue(12.706, 1).p, 0.05);
  close(tPValue(-2.228, 10).p, 0.05);
  close(tPValue(0, 10).p, 1, 1e-14);
});

// NIST/SEMATECH normal and chi-square critical-value tables (.05 upper tail for chi-square).
test('normal and chi-square tails match published critical values within 1e-4', () => {
  close(zPValue(1.96).p, 0.05);
  close(zPValue(-1.96).p, 0.05);
  close(normalCdf(1.96).value, 0.975);
  close(normalCdf(0).value, 0.5, 1e-14);
  close(chiSquarePValue(3.841, 1).p, 0.05);
  close(chiSquarePValue(5.991, 2).p, 0.05);
  close(chiSquarePValue(0, 2).p, 1, 1e-14);
});

// NIST/SEMATECH F .05 upper-tail table: numerator df=1, denominator df=10.
test('F matches the published 4.965 critical value within 1e-4', () => {
  close(fPValue(4.965, 1, 10).p, 0.05);
  close(fPValue(0, 1, 10).p, 1, 1e-14);
  assert.equal(fPValue(4.965, 1, 10).tail, 'upper');
});

test('Pearson r uses its n-2 t transformation, including signed and perfect r', () => {
  // The published t(10)=2.228 threshold corresponds to this r with n=12.
  const r = 2.228 / Math.sqrt(2.228 ** 2 + 10);
  close(rPValue(r, 12).p, 0.05);
  close(rPValue(-r, 12).p, 0.05);
  close(rPValue(0, 12).p, 1, 1e-14);
  close(rPValue(1, 12).p, 0, 1e-14);
  close(rPValue(-1, 12).p, 0, 1e-14);
});

test('extreme finite statistics retain representable tails instead of overflowing squares', () => {
  // Cauchy (t with 1 df) has exact two-sided tail 2*atan(1/t)/pi.
  const expected = 2 * Math.atan(1e-160) / Math.PI;
  const tTail = tPValue(1e160, 1).p;
  assert.ok(tTail !== null && tTail > 0);
  close(tTail / expected, 1, 1e-12);
  // F(2,2) has exact survival 1/(1+F).
  const fTail = fPValue(1e308, 2, 2).p;
  assert.ok(fTail !== null && fTail > 0);
  close(fTail / 1e-308, 1, 1e-12);
});

test('statcheck comparison distinguishes rounding agreement from crossing .05', () => {
  const agree = comparePValue(zPValue(2.58).p, 0.01, 2);
  assert.equal(agree.status, 'ok');
  assert.equal(agree.agreesAtPrecision, true);
  assert.equal(agree.consistent, true);
  assert.equal(agree.crossesSignificance, false);
  const crossing = comparePValue(zPValue(1.8).p, 0.03, 2);
  assert.equal(crossing.agreesAtPrecision, false);
  assert.equal(crossing.consistent, false);
  assert.equal(crossing.crossesSignificance, true);
  assert.match(crossing.message, /^SIGNIFICANCE CROSSING at 0.05/);
  const roundedBoundary = comparePValue(zPValue(1.96).p, 0.05, 2);
  assert.equal(roundedBoundary.agreesAtPrecision, true);
  assert.equal(roundedBoundary.crossesSignificance, true);
  assert.equal(comparePValue(0.05, 0.05, 2).crossesSignificance, false);
  assert.equal(comparePValue(0.045, 0.05, 2).agreesAtPrecision, true); // Decimal half away from zero.
});

test('p inequalities are tested as inequalities, without inventing a significance decision', () => {
  const less = comparePValue(0.04, 0.05, 2, '<');
  assert.equal(less.agreesAtPrecision, null);
  assert.equal(less.consistent, true);
  assert.equal(less.crossesSignificance, false);
  assert.equal(comparePValue(0.05, 0.05, 2, '<').consistent, false);
  assert.equal(comparePValue(0.06, 0.05, 2, '<').crossesSignificance, true);
  assert.equal(comparePValue(0.04, 0.1, 1, '<').crossesSignificance, null);
  assert.equal(comparePValue(0.05, 0.05, 2, '<=').consistent, true);
  assert.equal(comparePValue(0.05, 0.05, 2, '<=').crossesSignificance, null);
  assert.equal(comparePValue(0.04, 0.05, 2, '>').crossesSignificance, true);
  assert.equal(comparePValue(0.05, 0.05, 2, '>=').consistent, true);
});

test('parsed-statistic dispatcher handles every family and retains comparisons', () => {
  const parsed = [
    { type: 't', value: 2.228, df: 10 },
    { type: 'F', value: 4.965, numeratorDf: 1, denominatorDf: 10 },
    { type: 'chi-square', value: 3.841, df: 1 },
    { type: 'r', value: 2.228 / Math.sqrt(2.228 ** 2 + 10), n: 12 },
    { type: 'z', value: 1.96 },
  ];
  for (const statistic of parsed) {
    // JSON.parse models the parser boundary, not a TypeScript cast.
    const result = recomputeStatistic(JSON.parse(JSON.stringify(statistic)));
    assert.equal(result.status, 'ok');
    close(result.recomputedP, 0.05);
    assert.equal(result.consistent, null); // No reported p supplied.
  }
  const result = recomputeStatistic({ type: 'z', value: 1.8, reportedP: 0.03, pDecimals: 2 });
  assert.equal(result.crossesSignificance, true);
  assert.match(result.message, /^SIGNIFICANCE CROSSING/);
  const bound = recomputeStatistic({ type: 'z', value: 2.58, reportedP: 0.05, pDecimals: 2, relation: '<' });
  assert.equal(bound.consistent, true);
});

test('ordinary invalid data returns explicit result objects, not exceptions', () => {
  const results = [
    grim(NaN, 10, 2), grim(1.01, 0, 2), grim(1.01, 1.5, 2),
    grim(1.011, 10, 2), grim(1, 10, -1), grim(1, 10, 100),
    percentages(1, 0, 10, 0), percentages(4, 3, 100, 0), percentages(1.5, 3, 50, 0),
    percentages(1, 3, NaN, 1), estimateInInterval(Infinity, 0, 1),
    normalCdf(NaN), tPValue(1, 0), tPValue(NaN, 10),
    chiSquarePValue(-1, 2), fPValue(1, 0, 10), rPValue(1.01, 12), rPValue(0.5, 2),
    comparePValue(null, 0.05, 2), comparePValue(0.05, 1.1, 2),
    comparePValue(0.05, 0.051, 2), comparePValue(0.05, 0, 2, '<'),
    recomputeStatistic(null), recomputeStatistic(undefined),
    recomputeStatistic(JSON.parse('{"type":"unknown","value":1}')),
    recomputeStatistic(JSON.parse('{"type":"t","value":1}')),
    recomputeStatistic({ type: 'z', value: 1, reportedP: 0.1 }), // Missing precision.
  ];
  for (const result of results) {
    assert.equal(result.status, 'invalid');
    assert.equal(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  }
  assert.throws(() => grim(1, -1, 2), RangeError);
  assert.throws(() => rPValue(0.5, -1), RangeError);
});

function close(actual: number | null, expected: number, tolerance = 1e-4): void {
  assert.ok(actual !== null && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('GRIM changes at the exact n boundary for a mean of 1.01', () => {
  const impossible = grim(1.01, 66, 2);
  assert.equal(impossible.status, 'ok');
  assert.equal(impossible.possible, false);
  assert.deepEqual(impossible.totals, []);
  assert.deepEqual(impossible.nearestMeans, [1, 67 / 66]);
  assert.match(impossible.message, /no whole-number total gives a mean of 1.01 with n = 66/);
  const possible = grim(1.01, 67, 2);
  assert.equal(possible.possible, true);
  assert.deepEqual(possible.totals, [68]);
  assert.match(possible.message, /a mean of 1.01 is possible with n = 67/);
});

test('GRIM enumerates the full rounding window, including ties and signed means', () => {
  assert.deepEqual(grim(1.2, 100, 1).totals, [115, 116, 117, 118, 119, 120, 121, 122, 123, 124]);
  assert.deepEqual(grim(-1.2, 100, 1).totals, [-124, -123, -122, -121, -120, -119, -118, -117, -116, -115]);
  assert.deepEqual(grim(0, 10, 0).totals, [-4, -3, -2, -1, 0, 1, 2, 3, 4]);
  assert.deepEqual(grim(1.01, 200, 2).totals, [201, 202]);
  assert.deepEqual(grim(-1.01, 200, 2).totals, [-202, -201]);
  assert.equal(grim(0.29, 100, 2).possible, true);
  assert.equal(grim(1e20, 10, 0).status, 'invalid');
  assert.equal(grim(1, Number.MAX_SAFE_INTEGER, 0).status, 'invalid');
});

test('percentages rounds the counts, not the reported value', () => {
  const match = percentages(1, 3, 33.3, 1);
  assert.equal(match.status, 'ok');
  assert.equal(match.matches, true);
  assert.ok(match.actualPercentage !== null && Math.abs(match.actualPercentage - 100 / 3) < 1e-12);
  assert.equal(match.roundedPercentage, 33.3);
  const mismatch = percentages(1, 3, 33.4, 1);
  assert.equal(mismatch.matches, false);
  assert.match(mismatch.message, /33.3%/);
  assert.equal(percentages(1, 32, 3.13, 2).matches, true); // Exact half, away from zero.
});

test('an interval reports an outside estimate and inversion separately', () => {
  const outside = estimateInInterval(5, 1, 4);
  assert.equal(outside.valid, false);
  assert.equal(outside.inverted, false);
  assert.deepEqual(outside.failures, ['estimate-outside']);
  assert.match(outside.message, /outside/);
  const inverted = estimateInInterval(2, 4, 1);
  assert.equal(inverted.inverted, true);
  assert.deepEqual(inverted.failures, ['interval-inverted', 'estimate-outside']);
  assert.match(inverted.message, /inverted/);
  assert.equal(estimateInInterval(1, 1, 4).valid, true);
  assert.equal(estimateInInterval(4, 1, 4).valid, true);
  assert.equal(estimateInInterval(2, 2, 2).valid, true);
});
