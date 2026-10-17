import test from 'node:test';
import assert from 'node:assert/strict';

test('annex recomputes only explicit supported statistics and counts', async () => {
  const { runInstruments } = await import('../src/lib/instruments.ts');
  const result = runInstruments([{ id: 'P1', page: 1, section: 'Results', text: 't(10) = 2.228, p = .050. There were 5 of 10 (70%) participants. OR = 2.0, 95% CI [3.0, 4.0]. The mean was 2.33 (n = 10).' }]);
  assert.equal(result.statistics.length, 1);
  assert.equal(result.statistics[0].result.status, 'ok');
  assert.equal(result.percentages[0].result.matches, false);
  assert.equal(result.intervals[0].result.valid, false);
  assert.equal(result.grim.length, 0, 'whole-number measurement must not be assumed');
});
