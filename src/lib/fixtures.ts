import { CATALOGUE, type CatalogueCheck, type Domain } from './catalogue.ts';
import { evidence, verdict, type CheckResult, type Tally, type Verdict } from './engine.ts';
import type { Paragraph, Pick } from './scan.ts';

/** DEMONSTRATION DATA ONLY. Approved worked-example figures, not a live paper assessment.
 * Summary figures reproduce the approved illustration; they are not computed scan results.
 * A live adapter must derive its summaries with the engine instead of reusing these figures.
 */
export const DISCLOSURE = 'Built from published reporting guidelines. Not affiliated with, or endorsed by, K-Dense.';
export const DEMO_LABEL = 'Demonstration data';
export const PRIVACY_LINE = 'Read in your browser. The file is never uploaded. Only its text is sent. Nothing is saved.';
export interface DomainSummary {
  id: Domain;
  numeral: string;
  title: string;
  score: number;
  good: number;
  applicable: number;
}
export interface EvidencePassage extends Pick {
  page: number;
  section: string;
}
export interface EnquiryResult extends CheckResult {
  check: CatalogueCheck;
  label: string;
  applicable: boolean;
  state: Verdict | 'not-applicable';
  evidence: number;
  passage?: EvidencePassage;
}
export interface ScanPresentation {
  demonstration: boolean;
  paper: { title: string; doi?: string };
  index: number | null;
  counters: Tally & { notApplicable: number };
  domains: DomainSummary[];
  checks: EnquiryResult[];
  paragraphs: Paragraph[];
}
export const DOMAINS: DomainSummary[] = [
  { id: 'design', numeral: 'I', title: 'Study design', score: 67, good: 8, applicable: 13 },
  { id: 'stats', numeral: 'II', title: 'Statistics', score: 80, good: 7, applicable: 9 },
  { id: 'materials', numeral: 'III', title: 'Materials', score: 89, good: 11, applicable: 12 },
  { id: 'openness', numeral: 'IV', title: 'Data & code', score: 62, good: 5, applicable: 9 },
  { id: 'ethics', numeral: 'V', title: 'Ethics', score: 89, good: 9, applicable: 10 },
  { id: 'claims', numeral: 'VI', title: 'Claims', score: 87, good: 7, applicable: 8 },
];
const LABELS: Record<string, string> = {
  hypothesis: 'Hypothesis stated', primary_outcome: 'Primary outcome defined',
  sample_size_rationale: 'Sample size justified', randomization: 'Randomization',
  blinding_allocation: 'Blinded allocation', cell_authentication: 'Cell authentication',
  antibody_ids: 'Antibody identifiers', data_repository: 'Data in a repository',
  code_available: 'Code available', error_bars: 'Error bars defined',
};
const NOT_APPLICABLE = new Set([
  'trial_registration', 'allocation_concealment', 'confounders', 'missing_data', 'holdout',
  'leakage', 'baseline', 'external_validation', 'fdr', 'batch_effects',
  'guideline_named', 'omics_accession', 'adverse_events',
]);
const LOW = new Set([
  'sample_size_rationale', 'blinding_allocation', 'randomization_method', 'exclusions_reported',
  'error_bars', 'antibody_ids', 'data_repository', 'code_available', 'code_link',
  'data_on_request', 'funder_role', 'causal_overreach',
]);
const UNCLEAR = new Set(['replicate_type', 'assumptions']);
const KNOWN: Record<string, number> = {
  hypothesis: 0.98, primary_outcome: 0.89, sample_size_rationale: 0.08,
  randomization: 0.97, blinding_allocation: 0.25, cell_authentication: 0.98, antibody_ids: 0.14,
};
export const CELL_QUOTE = 'Cell line identities were confirmed by short tandem repeat profiling (Cellbank, Australia).';
export const DEMO_PARAGRAPH: Paragraph = { id: 'P003', section: 'Materials', text: CELL_QUOTE };
export const CELL_PASSAGE: EvidencePassage = {
  para: DEMO_PARAGRAPH.id, start: 0, end: CELL_QUOTE.length, quote: CELL_QUOTE, page: 3, section: 'Materials',
};
export const DEMO_CHECKS: EnquiryResult[] = CATALOGUE.map((check) => {
  const applicable = !NOT_APPLICABLE.has(check.id);
  const amount = KNOWN[check.id] ?? (LOW.has(check.id) ? 0.18 : UNCLEAR.has(check.id) ? 0.5 : 0.96);
  const p = check.polarity === 'flag' ? 1 - amount : amount;
  return {
    id: check.id, p, polarity: check.polarity, check,
    label: LABELS[check.id] ?? check.id.replaceAll('_', ' '), applicable,
    state: applicable ? verdict(p, check.polarity) : 'not-applicable',
    evidence: evidence(p, check.polarity),
    ...(check.id === 'cell_authentication' ? { passage: CELL_PASSAGE } : {}),
  };
});
export const DEMO_SCAN: ScanPresentation = {
  demonstration: true, paper: { title: 'Dubowitz et al. - PLOS ONE - 2023' }, index: 79,
  counters: { good: 47, unclear: 2, bad: 12, notApplicable: 13 },
  domains: DOMAINS, checks: DEMO_CHECKS, paragraphs: [DEMO_PARAGRAPH],
};
export const LEDGER_IDS = ['hypothesis', 'primary_outcome', 'sample_size_rationale', 'randomization', 'blinding_allocation', 'cell_authentication', 'antibody_ids'];
export const CELL_NOTE_QUESTION = "Was the cell line's identity confirmed by a method such as STR profiling?";
export const PETITIONS = [
  { id: 'sample_size_rationale', title: 'SAMPLE SIZE JUSTIFIED', action: 'Run the power calculation for the main comparison', count: 3 },
  { id: 'blinding_allocation', title: 'BLINDED ALLOCATION', action: 'Write the sentence stating who was blind to group', count: 2 },
  { id: 'cell_authentication', title: 'CELL AUTHENTICATION', action: 'Draft the wording for STR confirmation', count: 1 },
  { id: 'data_repository', title: 'DATA IN A REPOSITORY', action: 'Prepare the deposit and the README', count: 4 },
  { id: 'code_available', title: 'CODE AVAILABLE', action: 'Package the analysis with its environment', count: 7 },
  { id: 'error_bars', title: 'ERROR BARS DEFINED', action: 'Draft the figure legend lines', count: 5 },
] as const;
export interface InstrumentRow { numeral: string; title: string; method: string; state: string }
export const INSTRUMENTS: InstrumentRow[] = [
  { numeral: 'I', title: 'REPORTED STATISTICS', method: 'The t, F, r and z statistics are recomputed against their p-values. Method after statcheck, Nuijten et al. 2016.', state: 'consistent' },
  { numeral: 'II', title: 'RATIOS AND INTERVALS', method: 'An estimate must lie inside its own interval. Altman and Bland, 2011.', state: 'one mismatch' },
  { numeral: 'III', title: 'PER CENT WITH COUNTS', method: 'Every percentage is re-derived from its counts.', state: 'consistent' },
  { numeral: 'IV', title: 'MEANS OF WHOLE NUMBERS', method: 'A reported mean must be reachable with the reported n. GRIM, Brown and Heathers 2017.', state: 'nothing to redo' },
  { numeral: 'V', title: 'RETRACTIONS AND NOTICES', method: 'Checked against Crossref and Retraction Watch.', state: 'consistent' },
  { numeral: 'VI', title: 'CELL LINES', method: 'Matched against the Cellosaurus register, with STR profiles.', state: 'nothing to redo' },
  { numeral: 'VII', title: 'DATA, CODE AND REGISTRIES', method: 'DOIs must resolve, repositories must exist, accessions must be public.', state: 'consistent' },
];
/** Approved display wording, joined to the canonical catalogue by stable identifier. */
const OPENING_ENQUIRIES = [
  { id: 'hypothesis', question: 'Does the paper state the hypothesis it set out to test?', tag: '-' },
  { id: 'n_per_group', question: 'Was the number of subjects or samples in each group reported?', tag: 'ARRIVE 2' },
  { id: 'randomization', question: 'Was the allocation sequence generated at random?', tag: 'ARRIVE 4' },
  { id: 'blinding_allocation', question: 'Were the people who allocated the treatments kept blind?', tag: 'ARRIVE 5' },
  { id: 'sample_size_rationale', question: 'Was the sample size justified before the experiment?', tag: 'ARRIVE 2' },
  { id: 'cell_authentication', question: 'Was the identity of each cell line confirmed?', tag: '-' },
  { id: 'antibody_ids', question: 'Are the antibodies identified by clone, catalogue number or RRID?', tag: '-' },
];
export interface PrintedEnquiry { check: CatalogueCheck; question: string; tag: string }
export const PRINTED_CATALOGUE: PrintedEnquiry[] = [
  ...OPENING_ENQUIRIES.map((entry) => ({ check: CATALOGUE.find((c) => c.id === entry.id)!, question: entry.question, tag: entry.tag })),
  ...CATALOGUE.filter((c) => !OPENING_ENQUIRIES.some((entry) => entry.id === c.id))
    .map((check) => ({ check, question: check.question, tag: check.guidelines.join(', ') || '-' })),
];
