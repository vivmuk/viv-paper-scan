/** Which manuscript formats the browser can genuinely open, decided by file name alone. */
export type ManuscriptKind = 'pdf' | 'docx' | 'text' | 'doc' | null;

export const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md';

export function classifyManuscript(name: string): ManuscriptKind {
  if (/\.docx$/i.test(name)) return 'docx';
  if (/\.doc$/i.test(name)) return 'doc';
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.(?:txt|md|markdown)$/i.test(name)) return 'text';
  return null;
}

export function rejectionMessage(kind: ManuscriptKind): string | null {
  if (kind === 'doc') {
    return 'Legacy Word .doc files cannot be read in the browser. Choose a PDF, or save the manuscript as .docx and try again.';
  }
  if (kind === null) {
    return 'Choose a PDF, DOCX, TXT or MD file. Legacy Word .doc files are not accepted.';
  }
  return null;
}
