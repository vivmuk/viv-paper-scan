import { CATALOGUE, type CatalogueCheck, type Domain } from './catalogue.ts';
import { applies, evidence, score, tally, verdict, type Detection, type CheckResult, type Verdict } from './engine.ts';
import type { CheckOut, Paragraph, Pick, ScanEvent } from './scan.ts';

export type PaperParagraph = Paragraph & { page: number };
export type WireEvent = ScanEvent | { type: 'error'; message: string };
export interface ScanSession {
  paper: { title: string; doi?: string };
  paragraphs: PaperParagraph[];
  detections: Detection[] | null;
  answers: Record<string, CheckOut>;
  picks: Record<string, Pick>;
  domains: Domain[];
  notes: string[];
  status: 'scanning' | 'complete' | 'error' | 'cancelled';
  error?: string;
}
export interface EnquiryResult extends CheckResult {
  check: CatalogueCheck;
  label: string;
  applicable: boolean;
  state: Verdict | 'not-applicable' | 'pending' | 'unanswered';
  evidence: number;
  passage?: Pick & { page: number; section: string };
}
export interface ScanPresentation {
  demonstration: boolean;
  paper: ScanSession['paper'];
  paragraphs: PaperParagraph[];
  checks: EnquiryResult[];
  index: number | null;
  counters: { good: number; unclear: number; bad: number; notApplicable: number };
  pending: number;
  unanswered: number;
  domains: { id: Domain; numeral: string; title: string; score: number | null; good: number; applicable: number }[];
}
export const DOMAIN_LABELS: { id: Domain; numeral: string; title: string }[] = [
  { id: 'design', numeral: 'I', title: 'Study design' },
  { id: 'stats', numeral: 'II', title: 'Statistics' },
  { id: 'materials', numeral: 'III', title: 'Materials' },
  { id: 'openness', numeral: 'IV', title: 'Data & code' },
  { id: 'ethics', numeral: 'V', title: 'Ethics' },
  { id: 'claims', numeral: 'VI', title: 'Claims' },
];
const LABELS: Record<string, string> = {
  hypothesis: 'Hypothesis stated', primary_outcome: 'Primary outcome defined',
  sample_size_rationale: 'Sample size justified', randomization: 'Randomization',
  blinding_allocation: 'Blinded allocation', cell_authentication: 'Cell authentication',
  antibody_ids: 'Antibody identifiers', data_repository: 'Data in a repository',
  code_available: 'Code available', error_bars: 'Error bars defined',
};
export function createSession(paper: ScanSession['paper'], paragraphs: PaperParagraph[]): ScanSession {
  return { paper, paragraphs, detections: null, answers: {}, picks: {}, domains: [], notes: [], status: 'scanning' };
}
export function applyScanEvent(session: ScanSession, event: WireEvent): ScanSession {
  switch (event.type) {
    case 'detections': return { ...session, detections: event.detections };
    case 'domain': return { ...session, domains: [...new Set([...session.domains, event.domain])], answers: { ...session.answers, ...Object.fromEntries(event.checks.map(c => [c.id, c])) } };
    case 'sentences': return { ...session, picks: { ...session.picks, ...event.picks } };
    case 'note': return { ...session, notes: [...session.notes, event.message] };
    case 'done': return { ...session, status: 'complete' };
    case 'error': return { ...session, status: 'error', error: event.message };
  }
}
function parseEvent(line: string): WireEvent {
  let event: WireEvent;
  try { event = JSON.parse(line) as WireEvent; } catch { throw new Error('The scan returned an unreadable JSON line. Please retry.'); }
  if (!event || typeof event !== 'object') throw new Error('The scan returned an invalid event.');
  const valid = event.type === 'done' ? typeof event.checks === 'number'
    : event.type === 'note' || event.type === 'error' ? typeof event.message === 'string'
    : event.type === 'detections' ? Array.isArray(event.detections) && event.detections.every(d => typeof d.type === 'string' && Number.isFinite(d.confidence) && d.confidence >= 0 && d.confidence <= 1)
    : event.type === 'domain' ? DOMAIN_LABELS.some(d => d.id === event.domain) && Array.isArray(event.checks) && event.checks.every(c => CATALOGUE.some(k => k.id === c.id && k.domain === event.domain) && Number.isFinite(c.p) && c.p >= 0 && c.p <= 100 && Array.isArray(c.where))
    : event.type === 'sentences' ? !!event.picks && typeof event.picks === 'object' && Object.values(event.picks).every(p => typeof p.para === 'string' && Number.isInteger(p.start) && Number.isInteger(p.end) && typeof p.quote === 'string') : false;
  if (!valid) throw new Error('The scan returned an invalid event. Please retry.');
  return event;
}

/** Streaming TextDecoder retains split Unicode; the buffer retains split NDJSON records. */
export async function readScanStream(response: Response, onEvent: (event: WireEvent) => void, signal?: AbortSignal): Promise<void> {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `The scan request failed (${response.status}).`);
  }
  if (!response.body) throw new Error('The scan response had no readable stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  const cancel = () => { void reader.cancel(); };
  signal?.addEventListener('abort', cancel, { once: true });
  const emit = (line: string) => {
    if (!line.trim()) return;
    const event = parseEvent(line);
    onEvent(event);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'done') done = true;
  };
  try {
    while (true) {
      signal?.throwIfAborted();
      const part = await reader.read();
      buffer += decoder.decode(part.value, { stream: !part.done });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) { emit(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); }
      if (part.done) break;
    }
    signal?.throwIfAborted();
    emit(buffer);
    if (!done) throw new Error('The scan ended before it was complete. Please retry.');
  } finally {
    signal?.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function presentScan(session: ScanSession): ScanPresentation {
  const checks: EnquiryResult[] = CATALOGUE.map(check => {
    const answer = session.answers[check.id];
    const applicable = session.detections === null || applies(check.module, session.detections);
    const p = answer ? answer.p / 100 : 0;
    const settled = !!answer && !answer.evidenceMissing;
    const state = !applicable ? 'not-applicable' : settled ? verdict(p, check.polarity)
      : answer || session.status !== 'scanning' || session.domains.includes(check.domain) ? 'unanswered' : 'pending';
    const pick = session.picks[check.id];
    const paragraph = pick && session.paragraphs.find(p => p.id === pick.para);
    // The server located these offsets. Never search again, round them, or manufacture a pick.
    const passage = pick && paragraph && pick.start >= 0 && pick.end <= paragraph.text.length && pick.end > pick.start
      ? { ...pick, section: paragraph.section, page: paragraph.page } : undefined;
    return { id: check.id, check, label: LABELS[check.id] ?? check.id.replaceAll('_', ' '), p,
      polarity: check.polarity, applicable, state, evidence: settled && applicable ? evidence(p, check.polarity) : 0,
      ...(passage ? { passage } : {}) };
  });
  const scored = checks.filter(c => c.applicable && c.state !== 'pending' && c.state !== 'unanswered');
  return { demonstration: false, paper: session.paper, paragraphs: session.paragraphs, checks,
    index: score(scored), counters: { ...tally(scored), notApplicable: checks.filter(c => !c.applicable).length },
    pending: checks.filter(c => c.state === 'pending').length, unanswered: checks.filter(c => c.state === 'unanswered').length,
    domains: DOMAIN_LABELS.map(domain => {
      const members = scored.filter(c => c.check.domain === domain.id);
      return { ...domain, score: score(members), good: tally(members).good,
        applicable: checks.filter(c => c.applicable && c.check.domain === domain.id).length };
    }) };
}
