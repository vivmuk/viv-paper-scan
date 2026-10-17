/**
 * How a passage is referred to on the screens.
 *
 * PDFs have folios; Word and plain-text manuscripts do not, and inventing a page number would be
 * a lie. A paragraph with page 0 (or less) is referred to by its section and its ordinal position
 * among that section's paragraphs, derived from the paragraphs array already on the scan session.
 * The wire format is untouched: this reads the same array the screens already hold.
 */
import type { PaperParagraph } from './scan-client.ts';

export interface PassageRef {
  para: string;
  section: string;
  page: number;
}

/** "Folio 4" for a paginated paper; "Methods - paragraph 12" for one without folios. */
export function folioLabel(passage: PassageRef, paragraphs: PaperParagraph[]): string {
  if (passage.page > 0) return `${passage.section} - Folio ${passage.page}`;
  const ordinal = paragraphOrdinal(passage, paragraphs);
  return `${passage.section} - ${ordinal ? `paragraph ${ordinal}` : 'a paragraph'}`;
}

/** The 1-based ordinal of a paragraph among the paragraphs of its own section, or null. */
export function paragraphOrdinal(passage: PassageRef, paragraphs: PaperParagraph[]): number | null {
  const section = paragraphs.filter((p) => p.section === passage.section);
  const at = section.findIndex((p) => p.id === passage.para);
  return at === -1 ? null : at + 1;
}

/** Whether any folio anchor exists for this passage: only paginated papers have one. */
export function hasFolioAnchor(passage: PassageRef): boolean {
  return passage.page > 0;
}
