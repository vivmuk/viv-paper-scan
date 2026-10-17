import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerptWindow, folioLabel, sectionLabel, paragraphOrdinal } from '../src/lib/folio.ts';

test('a section slug gets its capital, and a known one gets its proper name', () => {
  assert.equal(sectionLabel('materials and methods'), 'Materials and methods');
  assert.equal(sectionLabel('front'), 'Front matter');
  assert.equal(sectionLabel('Methods'), 'Methods');
  assert.equal(sectionLabel('   '), 'Unnamed section');
});

test('a section name that is really a paper title is shortened, not left to swamp the quotation', () => {
  const title = 'Sample handling and assay variance in a mouse model of surgical resection';
  const label = sectionLabel(title);
  assert.ok(label.length <= 44, `label was ${label.length} chars`);
  assert.ok(label.endsWith('\u2026'), 'a shortened label must show that it was shortened');
  assert.equal(label.includes('  '), false);
});

test('a window is cut from the paper text and every piece is a genuine slice of it', () => {
  const text = 'First sentence here. The quoted finding sits in the middle of it. Final sentence here.';
  const start = text.indexOf('The quoted finding');
  const end = start + 'The quoted finding'.length;
  const window = excerptWindow(text, start, end, 220);
  assert.equal(window.quote, text.slice(start, end));
  assert.equal(window.clippedStart, false);
  assert.equal(window.clippedEnd, false);
  assert.equal(window.before + window.quote + window.after, text);
});

test('a cut window is marked as cut, and never begins or ends mid-word', () => {
  const text = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau';
  const start = text.indexOf('epsilon');
  const end = start + 'epsilon'.length;
  const window = excerptWindow(text, start, end, 20);
  assert.equal(window.quote, 'epsilon');
  assert.equal(window.clippedStart, true);
  assert.equal(window.clippedEnd, true);
  assert.equal(text.slice(0, start).endsWith(window.before), true, 'before must be a suffix of what precedes the quote');
  assert.equal(text.slice(end).startsWith(window.after), true, 'after must be a prefix of what follows it');
  assert.equal(window.before.startsWith(' '), false);
  assert.equal(window.after.endsWith(' '), false);
  assert.ok(window.before.length > 0 && window.after.length > 0);
});

test('a quote at the very start or end of a paragraph is not reported as cut', () => {
  const text = 'Opening words and then some more words to follow on afterwards.';
  const head = excerptWindow(text, 0, 7, 100);
  assert.equal(head.clippedStart, false);
  assert.equal(head.quote, 'Opening');
  const tail = excerptWindow(text, text.length - 9, text.length, 100);
  assert.equal(tail.clippedEnd, false);
});

test('a folio citation names the section properly for a paginated paper', () => {
  const paragraphs = [{ id: 'P001', section: 'materials and methods', text: 'x', page: 3 }];
  assert.equal(folioLabel({ para: 'P001', section: 'materials and methods', page: 4 }, paragraphs as never),
    'Materials and methods - Folio 4');
});

test('without folios the citation counts paragraphs inside the section, not the whole paper', () => {
  const paragraphs = [
    { id: 'P001', section: 'front', text: 'x', page: 0 },
    { id: 'P002', section: 'Methods', text: 'x', page: 0 },
    { id: 'P003', section: 'Methods', text: 'x', page: 0 },
    { id: 'P004', section: 'Methods', text: 'x', page: 0 },
  ];
  assert.equal(paragraphOrdinal({ para: 'P003', section: 'Methods', page: 0 }, paragraphs as never), 2);
  assert.equal(folioLabel({ para: 'P003', section: 'Methods', page: 0 }, paragraphs as never), 'Methods - paragraph 2');
  assert.equal(paragraphOrdinal({ para: 'P999', section: 'Methods', page: 0 }, paragraphs as never), null);
});
