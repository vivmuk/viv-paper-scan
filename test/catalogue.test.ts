import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOGUE } from '../src/lib/catalogue.ts';

interface SourceCheck {
  id: string;
  domain: string;
  module: string | string[] | null;
  modules?: string[] | null;
  guideline: string | null;
  question: string;
}

// Source wording is read only at test time, never embedded in this test or the catalogue.
const source: SourceCheck[] = JSON.parse(readFileSync(
  new URL('../recon/checks-catalog.json', import.meta.url), 'utf8',
));
const flagIds = ['significance_only', 'data_on_request', 'causal_overreach', 'overgeneralization'];
const allowedModules = new Set([
  'empirical', 'intervention', 'antibodies', 'animals', 'cells', 'humans', 'trial', 'ml', 'omics',
]);

/** Case and punctuation changes must not defeat the word-overlap guard. */
function words(text: string): string[] {
  return text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function eightGrams(text: string): string[] {
  const tokens = words(text);
  const grams: string[] = [];
  for (let i = 0; i + 8 <= tokens.length; i++) {
    grams.push(tokens.slice(i, i + 8).join(' '));
  }
  return grams;
}

function assertNoEightWordOverlap(
  checks: ReadonlyArray<{ id: string; question: string }>, reference: Set<string>,
): void {
  for (const check of checks) {
    for (const gram of eightGrams(check.question)) {
      assert.ok(!reference.has(gram), `${check.id} shares at least eight consecutive words with a source question`);
    }
  }
}

function sourceEightGrams(): Set<string> {
  assert.equal(source.length, 74, 'the comparison must include the full source catalogue');
  const grams = new Set<string>();
  for (const check of source) {
    assert.equal(typeof check.question, 'string', `missing reference question for ${check.id}`);
    assert.ok(words(check.question).length > 0, `empty reference question for ${check.id}`);
    for (const gram of eightGrams(check.question)) grams.add(gram);
  }
  assert.ok(grams.size > 0, 'an empty reference index would make the guard meaningless');
  return grams;
}

test('the catalogue contains exactly 74 unique enquiries', () => {
  assert.equal(CATALOGUE.length, 74);
  assert.equal(new Set(CATALOGUE.map((check) => check.id)).size, 74);
});

test('all source identifiers and domains are preserved without invented enquiries', () => {
  assert.deepEqual(CATALOGUE.map((check) => check.id).sort(), source.map((check) => check.id).sort());
  const byId = new Map(source.map((check) => [check.id, check]));
  for (const check of CATALOGUE) {
    assert.equal(check.domain, byId.get(check.id)?.domain, check.id);
    // The source stores gates under `modules` (plural); compare like for like, and treat
    // absent as empty rather than as undefined, since 29 checks are deliberately ungated.
    const src = byId.get(check.id);
    const ours = check.module == null ? [] : Array.isArray(check.module) ? check.module : [check.module];
    assert.deepEqual(ours, (src && src.modules) || [], check.id);
  }
});

test('each domain has the specified number of enquiries', () => {
  const counts: Record<string, number> = {};
  for (const check of CATALOGUE) counts[check.domain] = (counts[check.domain] ?? 0) + 1;
  assert.deepEqual(counts, { design: 15, stats: 17, materials: 12, openness: 10, ethics: 11, claims: 9 });
});

test('precisely the four warning enquiries use flag polarity', () => {
  const flags = CATALOGUE.filter((check) => check.polarity === 'flag');
  assert.equal(flags.length, 4);
  assert.deepEqual(flags.map((check) => check.id).sort(), [...flagIds].sort());
  for (const check of CATALOGUE) {
    assert.equal(check.polarity, flagIds.includes(check.id) ? 'flag' : 'good', check.id);
  }
});

test('every question is one 30-to-140-character interrogative sentence', () => {
  for (const check of CATALOGUE) {
    assert.equal(typeof check.question, 'string', check.id);
    assert.equal(check.question.trim(), check.question, check.id);
    assert.ok(check.question.length >= 30 && check.question.length <= 140,
      `${check.id}: question length is ${check.question.length}`);
    assert.ok(check.question.endsWith('?'), check.id);
    assert.equal((check.question.match(/\?/g) ?? []).length, 1, check.id);
    assert.ok(!/[.!]/u.test(check.question), `${check.id}: unexpected extra sentence`);
  }
});

test('every optional module belongs to the supported study types', () => {
  for (const check of CATALOGUE) {
    if (check.module === undefined) continue;
    const modules = Array.isArray(check.module) ? check.module : [check.module];
    assert.ok(modules.length > 0, check.id);
    for (const module of modules) assert.ok(allowedModules.has(module), `${check.id}: ${module}`);
  }
});

test('every enquiry has provenance and guideline references are explicit', () => {
  for (const check of CATALOGUE) {
    assert.equal(typeof check.provenance, 'string', check.id);
    assert.ok(check.provenance.trim().length > 0, check.id);
    assert.ok(Array.isArray(check.guidelines), check.id);
    if (check.guidelines.length === 0) {
      assert.equal(check.provenance, 'standard reporting practice', check.id);
    } else {
      assert.match(check.provenance, /\b2020\b/, check.id);
      for (const guideline of check.guidelines) {
        assert.match(guideline, /^ARRIVE 2\.0 item \d+[a-c]?$/, check.id);
        assert.ok(check.provenance.includes(guideline), check.id);
      }
    }
  }
  for (const original of source.filter((check) => check.guideline?.startsWith('ARRIVE '))) {
    const check = CATALOGUE.find((candidate) => candidate.id === original.id)!;
    // The published checklist corrects the structural source's misnumbered ethics item.
    const item = original.id === 'ethics_approval' ? '14' : original.guideline!.slice('ARRIVE '.length);
    assert.ok(check.guidelines.some((guideline) =>
      new RegExp(`^ARRIVE 2\\.0 item ${item}(?:[a-c])?$`).test(guideline)), check.id);
  }
});

test('ANTI-COPYING: no question shares an eight-word run with any source question', () => {
  assertNoEightWordOverlap(CATALOGUE, sourceEightGrams());
});

test('the overlap guard rejects a real source eight-gram inserted into other wording', () => {
  const reference = sourceEightGrams();
  const original = source.find((check) => words(check.question).length >= 8)!;
  const fragment = words(original.question).slice(0, 8).join(', ').toUpperCase();
  assert.throws(() => assertNoEightWordOverlap([
    { id: 'deliberate-overlap', question: `Unrelated opening ${fragment} unrelated closing?` },
  ], reference), /shares at least eight consecutive words/);
});

test('the overlap guard detects every window, ignores punctuation, and permits only seven shared words', () => {
  const reference = new Set(eightGrams('zero one two three four five six seven eight nine ten'));
  assert.throws(() => assertNoEightWordOverlap([
    { id: 'later-window', question: 'Different beginning TWO, THREE FOUR FIVE SIX SEVEN EIGHT NINE and ending?' },
  ], reference), /shares at least eight consecutive words/);
  assert.doesNotThrow(() => assertNoEightWordOverlap([
    { id: 'seven-words', question: 'Different beginning two three four five six seven eight and ending?' },
  ], reference));
});
