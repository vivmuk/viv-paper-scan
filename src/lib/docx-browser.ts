/**
 * Word (.docx) and plain-text manuscript ingestion.
 *
 * THE RULE: extraction happens entirely in the browser. The file is never uploaded; only the
 * section-tagged paragraphs leave it, exactly as for a PDF.
 *
 * A .docx is a ZIP whose word/document.xml holds the body. Word gives us what pdftotext cannot:
 * paragraphs carry style information, so a Heading1/Heading2/Heading3/Title style tags the section
 * directly and the PDF heading heuristic is only a fallback for documents without usable styles.
 * Word files have no folios; the assembler marks them page 0 and the screens show
 * "section - paragraph N" instead of "Folio N" whenever every folio is 0.
 */
import type { PaperParagraph } from './scan-client.ts';
import { extractDois } from './pdf-text.ts';
import { readZipEntry } from './zip-entry.ts';

const HEADING = /^(?:\d+[.\s]+)?(abstract|introduction|background|methods|materials(?: and methods)?|results|discussion|conclusions?|references|acknowledg(?:e)?ments|data availability|funding|ethics|supplement(?:ary|al).*|statistical analysis)\s*[:.]?$/i;

/** Word's own (and German) heading style ids, by level, plus the document Title style. */
const HEADING_STYLE = /^heading([1-6])$|^berschrift([1-6])$|^title$/i;

/**
 * Parse the body XML of a Word document into paragraph texts with their style ids, in document
 * order. Only the local bytes are read; nothing is sent anywhere.
 */
export function parseDocxBody(xml: string, limit = 4000): { texts: string[]; styles: (string | null)[] } {
  const body = /<w:body[ >]/.exec(xml);
  if (!body) throw new Error('This Word document has no readable body.');
  const document_ = xml.slice(body.index);
  const texts: string[] = [];
  const styles: (string | null)[] = [];
  for (const match of document_.matchAll(/<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p\s*>/g)) {
    const p = match[0];
    const selfClosing = p.endsWith('/>');
    const text = selfClosing ? '' : [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t\s*>|<w:tab\s*\/?>/g)]
      .map((t) => t[1] !== undefined ? decodeXml(t[1]) : '\t').join('');
    if (text.trim()) {
      const style = /<w:pStyle\s+(?:[^>]*\s)?w:val="([^"]*)"/.exec(p);
      texts.push(text.replace(/\s+/g, ' ').trim());
      styles.push(style ? style[1] : null);
    }
    if (texts.length >= limit) break;
  }
  return { texts, styles };
}

function decodeXml(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}

/**
 * The section a paragraph opens, judged from its Word style. A heading style wins over the text
 * heuristic, and the heading's own words become the section name, as in the PDF path. Titles and
 * numbered styles ("Heading 3", localized ids) count; ordinary body styles do not.
 */
export function sectionFromStyle(style: string, text: string): string | null {
  const heading = HEADING_STYLE.exec(style.trim());
  return heading ? text : null;
}

/** Assemble docx paragraphs into the same PaperParagraph shape the PDF path produces, with page 0. */
export function paragraphsFromDocx(texts: string[], styles: (string | null)[]): PaperParagraph[] {
  const out: PaperParagraph[] = [];
  let section = 'Unsectioned';
  for (let i = 0; i < texts.length; i++) {
    const styled = styles[i] ? sectionFromStyle(styles[i] as string, texts[i]) : null;
    if (styled) section = styled;
    else if (HEADING.test(texts[i])) section = texts[i];
    out.push({ id: `P${String(out.length + 1).padStart(4, '0')}`, section, text: texts[i], page: 0 });
  }
  return out;
}

/** Read the body of a plain-text or Markdown manuscript, one paragraph per blank-line block. */
export function paragraphsFromPlainText(text: string, limit = 4000): string[] {
  const out: string[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    // Markdown heading markers are dropped so "## Methods" tags the section like a Word style would.
    const clean = block.replace(/^[ \t]*#{1,6}[ \t]+/, '').replace(/[ \t]*\n[ \t]*/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean) out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

/** Everything the drop slot needs after a local read: the paragraphs, a title, and DOIs. */
export async function extractTextManuscript(file: File, kind: 'docx' | 'text', progress: (message: string) => void) {
  progress(kind === 'docx' ? 'Reading the Word file in your browser…' : 'Reading the text file in your browser…');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let texts: string[] = [];
  let styles: (string | null)[] = [];
  if (kind === 'docx') {
    const xmlBytes = await readZipEntry(bytes, 'word/document.xml');
    if (!xmlBytes) {
      throw new Error('This file does not look like a Word document (no word/document.xml inside). Choose a PDF, DOCX, TXT or MD file.');
    }
    const parsed = parseDocxBody(new TextDecoder('utf-8').decode(xmlBytes));
    texts = parsed.texts;
    styles = parsed.styles;
  } else {
    texts = paragraphsFromPlainText(new TextDecoder('utf-8').decode(bytes));
  }
  if (!texts.length) {
    throw new Error(kind === 'docx'
      ? 'This Word document has no readable body text. Choose a text-based manuscript.'
      : 'This text file has no readable paragraphs. Choose a text file with content.');
  }
  if (texts.length > 4000 || texts.reduce((n, t) => n + t.length, 0) > 2_000_000) {
    throw new Error('This paper exceeds the scan limit (4,000 paragraphs or 2,000,000 characters).');
  }
  const paragraphs = paragraphsFromDocx(texts, styles);
  const title = file.name.replace(/\.(?:docx|txt|md|markdown)$/i, '');
  const dois = extractDois(paragraphs.map((p) => p.text).join('\n'));
  return { paragraphs, paper: { title, ...(dois[0] ? { doi: dois[0] } : {}) } };
}
