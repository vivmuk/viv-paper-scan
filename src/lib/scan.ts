/**
 * The scan itself: gate the enquiries, ask the model one domain at a time, and attach evidence.
 *
 * THE RULE THIS MODULE ENFORCES: a language model is never trusted to say where a quotation sits.
 * It is asked to copy the passage out of the paragraph, and we then FIND that passage in the
 * paragraph ourselves and compute the character offsets from our own search. A quotation we cannot
 * locate is dropped, and the enquiry is recorded as having no usable evidence, rather than being
 * displayed with a pointer that might not mean anything. Everything downstream can therefore assume
 * that a shown quotation is the paper's own text at the offsets given.
 */

import { CATALOGUE, type CatalogueCheck, type Domain } from './catalogue.ts';
import { applies, type Detection } from './engine.ts';
import { chat, extractJson, type ChatOptions } from './venice.ts';

export interface Paragraph {
  id: string;
  section: string;
  text: string;
}

export interface EvidencePointer {
  para: string;
  weight: number;
}

export interface CheckOut {
  id: string;
  /** Probability the item IS reported, on the wire's own 0-100 scale. */
  p: number;
  where: EvidencePointer[];
  /** True when the model answered but nothing it offered could be found in the paper. */
  evidenceMissing?: boolean;
}

export interface Pick {
  para: string;
  start: number;
  end: number;
  quote: string;
}

export type ScanEvent =
  | { type: 'detections'; detections: Detection[] }
  | { type: 'domain'; domain: Domain; checks: CheckOut[] }
  | { type: 'sentences'; picks: Record<string, Pick> }
  | { type: 'note'; message: string }
  | { type: 'done'; checks: number };

/** The nine study types. Only a paper's own content may open a gate. */
export const STUDY_TYPES: Array<{ type: string; label: string; test: string }> = [
  { type: 'empirical', label: 'new experimental data', test: 'the paper generates new measurements or observations of its own' },
  { type: 'intervention', label: 'assigned treatments', test: 'the paper decides which subjects receive which condition' },
  { type: 'animals', label: 'animal work', test: 'living non-human animals are studied' },
  { type: 'humans', label: 'human participants', test: 'human participants or their specimens are studied' },
  { type: 'trial', label: 'a clinical trial', test: 'a prospectively registered trial of an intervention in humans is reported' },
  { type: 'cells', label: 'cell lines', test: 'cultured cell lines are used' },
  { type: 'antibodies', label: 'antibody reagents', test: 'antibodies are used as reagents' },
  { type: 'ml', label: 'a prediction model', test: 'a model is trained or evaluated to predict an outcome' },
  { type: 'omics', label: 'large-scale molecular data', test: 'sequencing, proteomics or similar high-throughput data are produced' },
];

const DOMAIN_TITLES: Record<Domain, string> = {
  design: 'study design',
  stats: 'statistics',
  materials: 'materials',
  openness: 'data and code',
  ethics: 'ethics and disclosure',
  claims: 'claims',
};

export function domainOrder(): Domain[] {
  return ['design', 'stats', 'materials', 'openness', 'ethics', 'claims'];
}

/** Join the paper for the prompt, each paragraph carrying the id we will quote back against. */
export function buildPaperText(paragraphs: Paragraph[], limit = 120_000): string {
  const out: string[] = [];
  let used = 0;
  for (const p of paragraphs) {
    const line = `[${p.id}] (${p.section}) ${p.text}`;
    if (used + line.length > limit) break;
    out.push(line);
    used += line.length;
  }
  return out.join('\n\n');
}

/** Clamp to the wire's 0-100 integer scale, refusing nonsense rather than inventing a number. */
export function clampPercent(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}

/**
 * Find a quotation inside a paragraph and return its offsets.
 * Whitespace is normalised for the SEARCH only; the returned offsets always index into the
 * paragraph as stored, so highlighting cannot drift.
 */
export function locateQuote(quote: string, paragraph: string): { start: number; end: number } | null {
  const needle = quote.trim();
  if (needle.length < 8) return null;
  const direct = paragraph.indexOf(needle);
  if (direct !== -1) return { start: direct, end: direct + needle.length };
  // Retry on a whitespace-collapsed copy, mapping back to the original indices.
  const norm = (s: string) => s.replace(/\s+/g, ' ');
  const index: number[] = [];
  let collapsed = '';
  let prevSpace = false;
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    const isSpace = /\s/.test(ch);
    if (isSpace) {
      if (prevSpace) continue;
      collapsed += ' ';
      index.push(i);
      prevSpace = true;
    } else {
      collapsed += ch;
      index.push(i);
      prevSpace = false;
    }
  }
  const at = norm(collapsed).indexOf(norm(needle));
  if (at === -1) return null;
  const start = index[at];
  const lastPos = index[Math.min(at + norm(needle).length - 1, index.length - 1)];
  return { start, end: lastPos + 1 };
}

export async function detectStudyTypes(
  paragraphs: Paragraph[],
  opts: ChatOptions = {} as ChatOptions,
): Promise<Detection[]> {
  const system =
    'You classify the study type of a research paper from its own text. You are conservative: ' +
    'a type is reported only when the text shows it, never because it is common in the field. ' +
    'Reply with JSON only.';
  const user = [
    'For each study type below, give a confidence between 0 and 1 that THIS paper contains it.',
    'Use 0 when the text gives no sign of it.',
    '',
    ...STUDY_TYPES.map((s) => `- ${s.type}: ${s.test}`),
    '',
    'Return exactly: {"detections":[{"type":"...","confidence":0.0}]}',
    '',
    'PAPER:',
    buildPaperText(paragraphs, 60_000),
  ].join('\n');

  const reply = await chat({
    ...opts,
    json: true,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const parsed = extractJson<{ detections?: Array<{ type?: string; confidence?: number }> }>(reply.content);
  const known = new Set(STUDY_TYPES.map((s) => s.type));
  const out: Detection[] = [];
  for (const d of parsed.detections ?? []) {
    if (!d?.type || !known.has(d.type)) continue;
    const confidence = typeof d.confidence === 'number' && d.confidence >= 0 && d.confidence <= 1 ? d.confidence : 0;
    out.push({ type: d.type, confidence });
  }
  return out;
}

interface RawCheck {
  p?: number | string;
  evidence?: Array<{ para?: string; quote?: string }>;
}

export async function scanDomain(
  domain: Domain,
  paragraphs: Paragraph[],
  detections: Detection[],
  opts: ChatOptions = {} as ChatOptions,
): Promise<{ checks: CheckOut[]; picks: Record<string, Pick> }> {
  const asked: CatalogueCheck[] = CATALOGUE.filter(
    (c) => c.domain === domain && applies(c.module, detections),
  );
  if (asked.length === 0) return { checks: [], picks: {} };

  const byId = new Map(paragraphs.map((p) => [p.id, p]));
  const system =
    'You audit how thoroughly a research paper REPORTS its methods, results and provenance. ' +
    'You are not judging whether the science is correct or interesting, only whether the paper says ' +
    'what it did. For every enquiry you answer with the probability that the item IS reported, ' +
    'where a paper that states the item plainly scores high and one that never mentions it scores low. ' +
    'Where you can, you copy the exact passage you relied on, character for character, out of the ' +
    'paragraph you found it in. Never paraphrase a passage you claim to be quoting. Reply with JSON only.';

  const user = [
    `Domain: ${DOMAIN_TITLES[domain]}. Answer every enquiry below, and only these.`,
    '',
    ...asked.map((c) => `- ${c.id}: ${c.question}`),
    '',
    'For each, return:',
    '  "p": an integer 0-100, the probability that the item is reported,',
    '  "evidence": a list of at most two entries, each {"para": the paragraph id, "quote": the exact text}.',
    'The quote must be copied verbatim from that paragraph. If nothing supports the answer, return an empty list.',
    '',
    'Return exactly: {"checks":{"<id>":{"p":0,"evidence":[{"para":"P001","quote":"..."}]}}}',
    '',
    'PAPER:',
    buildPaperText(paragraphs),
  ].join('\n');

  const reply = await chat({
    ...opts,
    json: true,
    maxTokens: 8192,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const parsed = extractJson<{ checks?: Record<string, RawCheck> }>(reply.content);
  const raw = parsed.checks ?? {};

  const checks: CheckOut[] = [];
  const picks: Record<string, Pick> = {};

  for (const check of asked) {
    const answer = raw[check.id];
    const p = clampPercent(answer?.p);
    if (p === null) {
      // An enquiry the model did not answer is reported as unanswered, not as a low score.
      checks.push({ id: check.id, p: 0, where: [], evidenceMissing: true });
      continue;
    }
    const where: EvidencePointer[] = [];
    let locatedFirst = false;
    for (const item of answer?.evidence ?? []) {
      const para = item?.para ? byId.get(item.para) : undefined;
      if (!para || !item?.quote) continue;
      const spot = locateQuote(item.quote, para.text);
      if (!spot) continue;
      if (!locatedFirst) {
        picks[check.id] = { para: para.id, start: spot.start, end: spot.end, quote: para.text.slice(spot.start, spot.end) };
        where.push({ para: para.id, weight: 1 });
        locatedFirst = true;
      } else {
        where.push({ para: para.id, weight: 0.5 });
      }
    }
    checks.push({ id: check.id, p, where, ...(where.length === 0 && p >= 50 ? { evidenceMissing: true } : {}) });
  }

  return { checks, picks };
}

/**
 * Run a whole scan, yielding one event per domain so a route can stream it.
 * Detections come first, because they decide which enquiries are asked at all.
 */
export async function* scanPaper(
  paragraphs: Paragraph[],
  opts: ChatOptions = {} as ChatOptions,
): AsyncGenerator<ScanEvent> {
  const detections = await detectStudyTypes(paragraphs, opts);
  yield { type: 'detections', detections };

  let answered = 0;
  for (const domain of domainOrder()) {
    const { checks, picks } = await scanDomain(domain, paragraphs, detections, opts);
    if (checks.length === 0) {
      yield { type: 'note', message: `${DOMAIN_TITLES[domain]}: nothing applies to this paper.` };
      continue;
    }
    answered += checks.filter((c) => !c.evidenceMissing).length;
    yield { type: 'domain', domain, checks };
    if (Object.keys(picks).length > 0) yield { type: 'sentences', picks };
  }
  yield { type: 'done', checks: answered };
}
