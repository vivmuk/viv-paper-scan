/**
 * The scoring engine: plain arithmetic, no model, no judgement.
 *
 * Recovered from the reverse engineering. A check does not answer yes or no; it returns the
 * probability that the item IS reported. Two thresholds turn that into a verdict, and four
 * warning-sign checks invert, because for those the finding of the problem is itself the bad news.
 */

export const THRESHOLDS = { reported: 0.7, missing: 0.35, gate: 0.6 } as const;

export type Polarity = 'good' | 'flag';
export type Verdict = 'reported' | 'unclear' | 'missing' | 'not-seen' | 'warning';

export interface CheckResult {
  id: string;
  p: number;
  polarity?: Polarity;
}

export interface Detection {
  type: string;
  confidence: number;
}

/** Evidence that the item is reported. Warning-sign checks invert. */
export function evidence(p: number, polarity: Polarity = 'good'): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError('probability out of range: ' + p);
  return polarity === 'flag' ? 1 - p : p;
}

export function verdict(p: number, polarity: Polarity = 'good'): Verdict {
  const e = evidence(p, polarity);
  if (polarity === 'flag') {
    if (e >= THRESHOLDS.reported) return 'not-seen';
    if (e < THRESHOLDS.missing) return 'warning';
    return 'unclear';
  }
  if (e >= THRESHOLDS.reported) return 'reported';
  if (e < THRESHOLDS.missing) return 'missing';
  return 'unclear';
}

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** 0-100, or null when nothing applied. Never invents a score from an empty set. */
export function score(results: CheckResult[]): number | null {
  if (results.length === 0) return null;
  return Math.round(100 * mean(results.map((r) => evidence(r.p, r.polarity ?? 'good'))));
}

export interface Tally {
  good: number; unclear: number; bad: number;
}

export function tally(results: CheckResult[]): Tally {
  const t: Tally = { good: 0, unclear: 0, bad: 0 };
  for (const r of results) {
    const v = verdict(r.p, r.polarity);
    if (v === 'reported' || v === 'not-seen') t.good++;
    else if (v === 'unclear') t.unclear++;
    else t.bad++;
  }
  return t;
}

/**
 * Study-type gating. A check with no module always applies; a gated check applies only when one
 * of its study types was detected at or above the gate confidence.
 */
export function applies(module: string | string[] | undefined, detected: Detection[]): boolean {
  if (!module || (Array.isArray(module) && module.length === 0)) return true;
  const list = Array.isArray(module) ? module : [module];
  return list.some((t) => {
    const hit = detected.find((d) => d.type === t);
    return (hit?.confidence ?? 0) >= THRESHOLDS.gate;
  });
}
