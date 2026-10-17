/**
 * How a passage is referred to on the screens, and how much of it is shown.
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

const SECTION_NAMES: Record<string, string> = {
  front: 'Front matter',
  abstract: 'Abstract',
  introduction: 'Introduction',
  methods: 'Methods',
  'materials and methods': 'Materials and methods',
  results: 'Results',
  discussion: 'Discussion',
  conclusions: 'Conclusions',
  acknowledgments: 'Acknowledgements',
};

/**
 * A section name fit to print beside a quotation.
 *
 * Section tags arrive in two shapes: a lowercase slug the PDF extractor inferred ("materials and
 * methods"), or, for a Word file, whatever the author's own heading said, which can be the paper's
 * title. The first needs its capital; the second needs shortening, or the citation swamps the
 * quotation it is meant to locate.
 */
export function sectionLabel(section: string, limit = 44): string {
  const key = section.trim();
  if (!key) return 'Unnamed section';
  const named = SECTION_NAMES[key.toLowerCase()];
  const text = named ?? key.charAt(0).toUpperCase() + key.slice(1);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}\u2026`;
}

/** Just the locator: "Folio 4", "paragraph 12", or "a paragraph" when the position is unknown. */
export function folioPlace(passage: PassageRef, paragraphs: PaperParagraph[]): string {
  if (passage.page > 0) return `Folio ${passage.page}`;
  const ordinal = paragraphOrdinal(passage, paragraphs);
  return ordinal ? `paragraph ${ordinal}` : 'a paragraph';
}

/** The whole citation: "Materials and methods - Folio 4", or "Methods - paragraph 12" without folios. */
export function folioLabel(passage: PassageRef, paragraphs: PaperParagraph[]): string {
  return `${sectionLabel(passage.section)} - ${folioPlace(passage, paragraphs)}`;
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

export interface ExcerptWindow {
  before: string;
  quote: string;
  after: string;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/**
 * The quotation with a little of its own paragraph either side.
 *
 * A bare sentence proves nothing about where it sits: the reader wants to see it in the place the
 * author wrote it, and to judge for themselves whether it was being quoted in good faith. The
 * offsets are the ones the server computed by searching the paper, so this window is cut from the
 * paper's own text. When a window is cut, the cut is marked rather than silently closed up.
 */
export function excerptWindow(text: string, start: number, end: number, radius = 220): ExcerptWindow {
  const quote = text.slice(start, end);
  let before = text.slice(Math.max(0, start - radius), start);
  let after = text.slice(end, Math.min(text.length, end + radius));
  const clippedStart = start - radius > 0;
  const clippedEnd = end + radius < text.length;
  if (clippedStart) {
    const space = before.indexOf(' ');
    if (space !== -1) before = before.slice(space + 1);
  }
  if (clippedEnd) {
    const space = after.lastIndexOf(' ');
    if (space !== -1) after = after.slice(0, space);
  }
  return { before, quote, after, clippedStart, clippedEnd };
}
