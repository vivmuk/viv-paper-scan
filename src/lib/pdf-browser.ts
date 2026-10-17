import { paragraphsFromPages, extractDois, type PdfPageText } from './pdf-text.ts';

/** This module is loaded only on a file selection, never during server rendering. */
export async function extractPdf(file: File, progress: (message: string) => void) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('This file is not a readable PDF. Choose another file.');
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
  try {
    const pdf = await task.promise;
    const pages: PdfPageText[] = [];
    for (let page = 1; page <= pdf.numPages; page++) {
      progress(`Reading folio ${page} of ${pdf.numPages} in your browser…`);
      const sheet = await pdf.getPage(page);
      const content = await sheet.getTextContent();
      pages.push({ page, items: content.items.filter(item => 'str' in item) });
      sheet.cleanup();
    }
    const paragraphs = paragraphsFromPages(pages);
    if (!paragraphs.length) throw new Error('This PDF has no readable text layer. Use a text-based or OCR-processed PDF.');
    if (paragraphs.length > 4000 || paragraphs.reduce((n, p) => n + p.text.length, 0) > 2_000_000) throw new Error('This paper exceeds the scan limit (4,000 paragraphs or 2,000,000 characters).');
    const metadata = await pdf.getMetadata().catch(() => null);
    const info = metadata?.info as { Title?: string } | undefined;
    const title = info?.Title?.trim() || file.name.replace(/\.pdf$/i, '');
    const dois = extractDois(paragraphs.map(p => p.text).join('\n'));
    return { paragraphs, paper: { title, ...(dois[0] ? { doi: dois[0] } : {}) } };
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('This PDF is password protected. Choose an unlocked copy.');
    throw error;
  } finally { await task.destroy(); }
}
