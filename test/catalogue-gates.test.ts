import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOGUE } from '../src/lib/catalogue.ts';
import { applies } from '../src/lib/engine.ts';

// Deliberately free of type annotations: this file is run straight by node --test, and plain
// syntax keeps it independent of the type stripper.

const ALLOWED = ['empirical', 'intervention', 'antibodies', 'animals', 'cells', 'humans', 'trial', 'ml', 'omics'];

// Read the provenance record directly, so this test cannot drift from the data it describes.
const source = JSON.parse(readFileSync(new URL('../recon/checks-catalog.json', import.meta.url), 'utf8'));
const sourceById = new Map(source.map((s) => [s.id, s.modules || []]));

const asList = (m) => (m == null ? [] : Array.isArray(m) ? m : [m]);

test('every gated check carries a gate, and the ungated ones carry none', () => {
  const gated = CATALOGUE.filter((c) => asList(c.module).length > 0);
  assert.equal(gated.length, 45, 'the source gates 45 of the 74 checks');
  assert.equal(CATALOGUE.length - gated.length, 29, 'the other 29 apply to every paper');
});

test('gate values are drawn only from the nine study types', () => {
  for (const c of CATALOGUE) {
    for (const m of asList(c.module)) assert.ok(ALLOWED.includes(m), c.id + ': bad gate ' + m);
  }
});

test('our gates equal the source gates, id for id', () => {
  assert.equal(sourceById.size, CATALOGUE.length);
  for (const c of CATALOGUE) {
    assert.deepEqual(
      [...asList(c.module)].sort(),
      [...asList(sourceById.get(c.id))].sort(),
      'gate mismatch on ' + c.id,
    );
  }
});

test('a gated check is dropped when its study type is absent, and kept when it is present', () => {
  const cellsCheck = CATALOGUE.find((c) => asList(c.module).includes('cells'));
  assert.ok(cellsCheck, 'expected at least one cell-line gated check');
  assert.equal(applies(cellsCheck.module, []), false, 'not asked on a paper with no cell work');
  assert.equal(applies(cellsCheck.module, [{ type: 'cells', confidence: 0.91 }]), true);
  assert.equal(applies(cellsCheck.module, [{ type: 'cells', confidence: 0.59 }]), false, 'below the gate');
});

test('an ungated check is always asked', () => {
  const ungated = CATALOGUE.filter((c) => asList(c.module).length === 0);
  assert.equal(ungated.length, 29);
  for (const c of ungated) assert.equal(applies(c.module, []), true, c.id + ' should always apply');
});
