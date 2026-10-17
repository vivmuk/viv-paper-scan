import test from 'node:test';
import assert from 'node:assert/strict';

test('PDF text assembly retains folios, stable IDs, sections, and line spacing', async () => {
  const { paragraphsFromPages } = await import('../src/lib/pdf-text.ts');
  const out = paragraphsFromPages([{ page: 2, items: [
    { str: 'Methods', transform: [1,0,0,12,40,700], hasEOL: true },
    { str: 'We tested', transform: [1,0,0,12,40,670], hasEOL: false },
    { str: '10 samples.', transform: [1,0,0,12,100,670], hasEOL: true },
    { str: 'The next paragraph.', transform: [1,0,0,12,40,630], hasEOL: true },
  ] }]);
  assert.equal(out.length, 3);
  assert.deepEqual(out[1], { id: 'P0002', page: 2, section: 'Methods', text: 'We tested 10 samples.' });
  assert.equal(out[2].id, 'P0003');
});

test('ordinary wrapped PDF lines remain in the same paragraph', async () => {
  const { paragraphsFromPages } = await import('../src/lib/pdf-text.ts');
  const out = paragraphsFromPages([{ page: 1, items: [
    { str: 'A line starts', transform: [1,0,0,12,40,700] },
    { str: 'here', transform: [1,0,0,12,190,700], hasEOL: true },
    { str: 'and continues below.', transform: [1,0,0,12,40,686], hasEOL: true },
  ] }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'A line starts here and continues below.');
});
