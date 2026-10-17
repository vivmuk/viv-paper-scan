/**
 * What the reader is told while a scan is running.
 *
 * The scan is seven steps: one study-type decision, then six domain passes in the published order.
 * The client holds all seven in advance, so progress here is counted, never guessed. Two rules
 * govern the wording: nothing is shown that has not arrived, and the time remaining is derived
 * from the pace actually observed rather than from a number somebody liked.
 */
import { DOMAIN_LABELS, type ScanPresentation, type ScanSession } from './scan-client.ts';
import { STUDY_TYPES } from './study-types.ts';
import { THRESHOLDS } from './engine.ts';

export interface ReadingStep {
  key: string;
  numeral: string;
  title: string;
  state: 'read' | 'reading' | 'waiting';
  detail?: string;
}

/** The types the scan actually recognised: the same gate the engine uses to ask its enquiries. */
export function recognisedTypes(session: ScanSession): string[] {
  if (!session.detections) return [];
  return session.detections
    .filter((detection) => detection.confidence >= THRESHOLDS.gate)
    .map((detection) => STUDY_TYPES.find((type) => type.type === detection.type)?.label ?? detection.type);
}

/** The seven steps, in order, in whatever state they have actually reached. */
export function readingSteps(session: ScanSession | null, scan: ScanPresentation | null): ReadingStep[] {
  if (!session) return [];
  const scanning = session.status === 'scanning';
  const typed = session.detections !== null;
  const names = recognisedTypes(session);
  const steps: ReadingStep[] = [{
    key: 'study-type',
    numeral: '—',
    title: 'Study type',
    state: typed ? 'read' : scanning ? 'reading' : 'waiting',
    ...(typed ? { detail: names.length ? `read as ${names.join(' · ')}` : 'no study type stood out, so only the universal enquiries apply' } : {}),
  }];
  const at = DOMAIN_LABELS.find((domain) => !session.domains.includes(domain.id));
  for (const domain of DOMAIN_LABELS) {
    const received = session.domains.includes(domain.id);
    const asked = scan?.domains.find((item) => item.id === domain.id)?.applicable ?? 0;
    steps.push({
      key: domain.id,
      numeral: domain.numeral,
      title: domain.title,
      state: received ? 'read' : typed && scanning && at?.id === domain.id ? 'reading' : 'waiting',
      ...(received ? { detail: `${asked} ${asked === 1 ? 'enquiry' : 'enquiries'} examined` } : {}),
    });
  }
  return steps;
}

/** Steps finished out of seven: what the display counts, and what the estimate is built on. */
export function stepsDone(session: ScanSession | null): number {
  return readingSteps(session, null).filter((step) => step.state === 'read').length;
}

/** "0 s", "47 s", "1 min 12 s", "2 min" — the time actually spent, nothing else. */
export function elapsedLabel(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/**
 * How long the remaining steps should take, from the observed pace.
 *
 * Arrival times are the only evidence of pace available, so the mean gap between completed steps is
 * the estimate. Before two steps have finished there is no pace to measure and this returns null:
 * an estimate invented at the start would be a claim the reader cannot check.
 */
export function paceRemaining(arrivals: number[], remaining: number, now: number): number | null {
  if (remaining <= 0) return 0;
  if (arrivals.length < 2) return null;
  const gaps = arrivals.slice(1).map((time, i) => time - arrivals[i]).filter((gap) => gap > 0);
  if (!gaps.length) return null;
  const mean = gaps.reduce((total, gap) => total + gap, 0) / gaps.length;
  return Math.max(0, mean * remaining);
}

/** Coarse on purpose: a precise-looking number would be a false precision, and is always rounded up. */
export function remainingLabel(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds <= 50) return 'about half a minute left';
  if (seconds < 100) return 'about a minute left';
  return `about ${Math.round(seconds / 60)} min left`;
}

/** How long the step now running has been silent, so a slow pass can be said out loud. */
export function silentFor(session: ScanSession | null, now: number): number | null {
  if (!session || session.status !== 'scanning') return null;
  const arrivals = session.arrivals ?? [];
  const since = arrivals.length ? arrivals[arrivals.length - 1] : session.startedAt ?? now;
  return Math.max(0, now - since);
}
