import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { buildDocx, wordParagraph, zipEntry } from './helpers/docx-fixture.ts';

test('a genuinely zipped docx yields its paragraphs with Word style sections and page 0', async () => {
  const { parseDocxBody, paragraphsFromDocx } = await import('../src/lib/docx-browser.ts');
  const { readZipEntry } = await import('../src/lib/zip-entry.ts');
  const docx = buildDocx([
    wordParagraph('Title', 'A Study of Widgets'),
    wordParagraph(null, 'This paper reports a study of widgets under stress.'),
    wordParagraph('Heading1', 'Methods'),
    wordParagraph(null, 'We measured ten widgets twice each.'),
    wordParagraph('Heading2', 'Statistical analysis'),
    wordParagraph(null, 'We used a linear mixed model.'),
  ].join(''));
  const xmlBytes = await readZipEntry(new Uint8Array(docx), 'word/document.xml');
  assert.ok(xmlBytes, 'the real deflated entry must be found and inflated');
  const { texts, styles } = parseDocxBody(new TextDecoder().decode(xmlBytes));
  assert.deepEqual(texts, [
    'A Study of Widgets',
    'This paper reports a study of widgets under stress.',
    'Methods',
    'We measured ten widgets twice each.',
    'Statistical analysis',
    'We used a linear mixed model.',
  ]);
  assert.deepEqual(styles, ['Title', null, 'Heading1', null, 'Heading2', null]);
  const paragraphs = paragraphsFromDocx(texts, styles);
  assert.equal(paragraphs.length, 6);
  assert.equal(paragraphs[0].section, 'A Study of Widgets'); // Title style opens a section
  assert.equal(paragraphs[1].section, 'A Study of Widgets');
  assert.equal(paragraphs[2].section, 'Methods'); // Heading1 style beats the heuristic
  assert.equal(paragraphs[3].section, 'Methods');
  assert.equal(paragraphs[4].section, 'Statistical analysis'); // Heading2, not a heuristic match
  assert.equal(paragraphs[5].section, 'Statistical analysis');
  assert.equal(paragraphs[0].id, 'P0001');
  assert.equal(paragraphs[5].id, 'P0006');
  assert.ok(paragraphs.every((p) => p.page === 0), 'Word paragraphs carry no folio');
});

test('a docx without heading styles falls back to the text heuristic', async () => {
  const { paragraphsFromDocx } = await import('../src/lib/docx-browser.ts');
  const texts = ['Methods', 'We measured ten widgets twice each.', 'Results follow in the next section.'];
  const paragraphs = paragraphsFromDocx(texts, texts.map(() => null));
  assert.equal(paragraphs[0].section, 'Methods');
  assert.equal(paragraphs[1].section, 'Methods');
  // Prose that merely mentions "results" is not a heading: it stays in the previous section.
  assert.equal(paragraphs[2].section, 'Methods');
});

test('a corrupt or non-zip docx is refused with a clear message, not empty text', async () => {
  const { readZipEntry } = await import('../src/lib/zip-entry.ts');
  await assert.rejects(readZipEntry(new Uint8Array([0x50, 0x4b, 0x00, 0x00, 0x00, 0x00]), 'x'), /not a readable archive/);
  await assert.rejects(readZipEntry(new Uint8Array(deflateRawSync(Buffer.from('plain'))), 'x'), /not a readable archive/);
});

test('a zipped package without word/document.xml is refused, not silently emptied', async () => {
  const { readZipEntry } = await import('../src/lib/zip-entry.ts');
  const onlyContentTypes = zipEntry('[Content_Types].xml', Buffer.from('<Types/>', 'utf8'));
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(onlyContentTypes.central.length, 12);
  eocd.writeUInt32LE(onlyContentTypes.local.length, 16);
  const zip = Buffer.concat([onlyContentTypes.local, onlyContentTypes.central, eocd]);
  assert.equal(await readZipEntry(new Uint8Array(zip), 'word/document.xml'), null);
  const { extractTextManuscript } = await import('../src/lib/docx-browser.ts');
  const fakeFile = new File([zip], 'paper.docx');
  await assert.rejects(() => extractTextManuscript(fakeFile, 'docx', () => {}), /no word\/document\.xml/);
});

test('legacy .doc is refused with guidance to save as .docx or PDF, and never parsed', async () => {
  const { rejectionMessage, classifyManuscript } = await import('../src/lib/accept.ts');
  assert.equal(classifyManuscript('manuscript.doc'), 'doc');
  const message = rejectionMessage('doc');
  assert.match(message as string, /\.docx/);
  assert.match(message as string, /PDF/);
  // The refusal fires before any extraction is attempted, so no paragraphs can exist.
  const { extractTextManuscript } = await import('../src/lib/docx-browser.ts');
  const fakeFile = new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])], 'manuscript.doc');
  await assert.rejects(
    () => extractTextManuscript(fakeFile, 'docx', () => {}),
    (error: unknown) => error instanceof Error,
  );
});

test('plain text goes through the same assembler with sections intact', async () => {
  const { paragraphsFromPlainText, paragraphsFromDocx } = await import('../src/lib/docx-browser.ts');
  const texts = paragraphsFromPlainText([
    'Methods',
    'We measured ten widgets twice each, on two days.',
    '',
    'Results',
    'Widget A survived.',
    '',
    '',
    'Widget B also survived, with caveats.',
  ].join('\n\n'));
  assert.deepEqual(texts, [
    'Methods',
    'We measured ten widgets twice each, on two days.',
    'Results',
    'Widget A survived.',
    'Widget B also survived, with caveats.',
  ]);
  const paragraphs = paragraphsFromDocx(texts, texts.map(() => null));
  assert.equal(paragraphs.length, 5);
  assert.equal(paragraphs[0].section, 'Methods');
  assert.equal(paragraphs[1].section, 'Methods');
  assert.equal(paragraphs[2].section, 'Results');
  assert.equal(paragraphs[3].section, 'Results');
  assert.equal(paragraphs[4].section, 'Results');
  assert.ok(paragraphs.every((p) => p.page === 0));
  assert.equal(paragraphs[0].id, 'P0001');
  assert.equal(paragraphs[4].id, 'P0005');
});

test('markdown blank-line blocks become paragraphs and headings tag sections by text', async () => {
  const { paragraphsFromPlainText, paragraphsFromDocx } = await import('../src/lib/docx-browser.ts');
  const texts = paragraphsFromPlainText('# Data availability\n\nAll code is at the repository.\n\n## Funding\n\nThis work was funded by nobody.');
  const paragraphs = paragraphsFromDocx(texts, texts.map(() => null));
  assert.equal(paragraphs.length, 4);
  assert.equal(paragraphs[0].section, 'Data availability');
  assert.equal(paragraphs[1].section, 'Data availability');
  assert.equal(paragraphs[2].section, 'Funding');
});

test('the paragraph ordinal replaces the folio reference for page-0 manuscripts', async () => {
  const { folioLabel, paragraphOrdinal, hasFolioAnchor } = await import('../src/lib/folio.ts');
  const { paragraphsFromPlainText, paragraphsFromDocx } = await import('../src/lib/docx-browser.ts');
  const texts = paragraphsFromPlainText(['Methods', 'First methods paragraph.', 'Second methods paragraph.', 'Results', 'First results paragraph.'].join('\n\n'));
  const paragraphs = paragraphsFromDocx(texts, texts.map(() => null));
  const secondMethods = { para: paragraphs[2].id, section: paragraphs[2].section, page: paragraphs[2].page };
  const results = { para: paragraphs[4].id, section: paragraphs[4].section, page: paragraphs[4].page };
  assert.equal(paragraphOrdinal(secondMethods, paragraphs), 3); // the heading itself counts, as in the PDF assembler
  assert.equal(paragraphOrdinal(results, paragraphs), 2);
  assert.equal(folioLabel(secondMethods, paragraphs), 'Methods - paragraph 3');
  assert.equal(folioLabel(results, paragraphs), 'Results - paragraph 2');
  assert.equal(hasFolioAnchor(results), false, 'no folio anchor exists for a Word manuscript');
  // PDFs keep their folio label and anchor exactly as before.
  const pdfParagraph = { para: paragraphs[0].id, section: paragraphs[0].section, page: 4 };
  assert.equal(folioLabel(pdfParagraph, paragraphs), 'Methods - Folio 4');
  assert.equal(hasFolioAnchor(pdfParagraph), true);
  // An unknown paragraph (not on the session) degrades to a honest non-numeric reference.
  assert.equal(paragraphOrdinal({ para: 'P9999', section: 'Methods', page: 0 }, paragraphs), null);
  assert.equal(folioLabel({ para: 'P9999', section: 'Methods', page: 0 }, paragraphs), 'Methods - a paragraph');
});
