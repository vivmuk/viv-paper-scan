import type { PaperParagraph } from './scan-client.ts';
export interface PdfTextItem { str: string; transform: number[]; hasEOL?: boolean }
export interface PdfPageText { page: number; items: PdfTextItem[] }
const HEADING = /^(?:\d+[.\s]+)?(abstract|introduction|background|methods|materials(?: and methods)?|results|discussion|conclusions?|references|acknowledg(?:e)?ments|data availability|funding|ethics|supplement(?:ary|al).*|statistical analysis)\s*[:.]?$/i;
/** Assemble in PDF.js reading order, never re-sort two-column text by y alone. */
export function paragraphsFromPages(pages: PdfPageText[]): PaperParagraph[] {
  const out: PaperParagraph[] = [];
  let section = 'Unsectioned';
  for (const page of pages) {
    let text = '';
    let previousY: number | undefined;

    const flush = () => {
      const clean = text.replace(/\s+/g, ' ').trim();
      if (clean) {
        if (HEADING.test(clean)) section = clean;
        out.push({ id: `P${String(out.length + 1).padStart(4, '0')}`, section, text: clean, page: page.page });
      }
      text = '';
    };
    for (const item of page.items) {
      if (!item.str.trim()) continue;
      const y = item.transform[5] ?? 0;
      const height = Math.abs(item.transform[3]) || 12;
      if (previousY !== undefined && (Math.abs(y - previousY) > height * 1.7 || y > previousY + height)) flush();
      if (HEADING.test(item.str.trim())) { flush(); text = item.str; flush(); }
      else text += `${text ? ' ' : ''}${item.str}`;
      previousY = y;
    }
    flush();
  }
  return out;
}
export function extractDois(text: string): string[] {
  return [...new Set((text.match(/\b10\.\d{4,9}\/[^\s<>"\]]+/gi) ?? []).map(d => d.replace(/[.,;:)]+$/, '')))].slice(0, 200);
}
