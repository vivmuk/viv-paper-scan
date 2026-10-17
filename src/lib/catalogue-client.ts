import type { CatalogueCheck } from './catalogue.ts';
export interface PublishedCatalogue {
  count: number;
  checks: Array<Omit<CatalogueCheck, 'module'> & { gate: string | string[] | null }>;
  thresholds: { reported: number; missing: number; gate: number; explanation: string };
  studyTypes: { type: string; label: string; test: string }[];
  provenance: { wording: string; upstream: string; disclaimer: string };
}
