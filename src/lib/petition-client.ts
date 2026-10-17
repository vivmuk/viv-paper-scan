import { DISCLOSURE, PETITIONS } from './fixtures.ts';
import type { ScanPresentation } from './scan-client.ts';
export function petitionItems(scan: ScanPresentation) {
  return scan.checks.filter(c => c.applicable && (c.state === 'missing' || c.state === 'warning')).map(c => ({
    id: c.id, title: c.label.toUpperCase(),
    action: PETITIONS.find(p => p.id === c.id)?.action ?? `Help address this reporting enquiry: ${c.check.question}`,
    count: 1,
  }));
}
/** Only enquiry wording leaves the page. No quotation or paragraph is included. */
export function petitionBrief(scan: ScanPresentation, selected: string[], includeTitle: boolean): string {
  const chosen = petitionItems(scan).filter(item => selected.includes(item.id));
  return ['THE PETITION', ...(includeTitle ? [scan.paper.title, ...(scan.paper.doi ? [scan.paper.doi] : [])] : []),
    ...chosen.map(item => `${item.title}\n${item.action}`),
    ...(chosen.length === 0 ? ['Choose which particulars to petition for.'] : []), '', DISCLOSURE].join('\n\n');
}
