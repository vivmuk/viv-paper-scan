# viv-paper-scan - build specification

## 1. What it is
An open-source reporting-completeness scanner for research papers. A reader drops in a PDF; the app answers a fixed
catalogue of 74 reporting enquiries across six domains, returns a completeness index, and shows - for every answer -
the sentence in the paper it rests on. A Victorian almanac in structure, a modern tool in behaviour.

## 2. Provenance and licence
- Licence: MIT.
- Protocol reverse-engineered from K-Dense's hosted Rigor Scan by wire capture (not from source). Credited in the README.
- The enquiry catalogue derives from the published upstream the same tool cites - principally ARRIVE 2.0 - with OUR OWN
  wording for every item and a `provenance` field per check recording the guideline item. We do not copy their strings.
- Engine: Venice chat completions. The reference tool uses Jev (TypeSafe); this build swaps in a Venice model.

## 3. Architecture
- Browser: pdf.js parses the PDF, tags sections, emits `{id:"P001", section, text}` paragraphs. The file never leaves the device.
- `POST /api/scan` takes those paragraphs and streams NDJSON back, one event per domain.
- `POST /api/lookup` resolves identifiers (DOIs, PMIDs, links) against Crossref.
- The Venice key is server-side (`VENICE_API_KEY`) and never reaches the browser. Only extracted text leaves the device.

## 4. The check model
74 checks, six domains: study design, statistics, materials, data & code, ethics & disclosure, claims.
- Each check: id (snake_case), domain, question (our wording), guideline tags, study-type module, polarity.
- `polarity: flag` marks the four warning-sign checks, where FINDING the problem LOWERS the score
  (significance-only reporting, data only on request, causal overreach, overgeneralisation).
- Thresholds: evidence >= 0.70 reported; < 0.35 missing; between them unclear. A study-type module must be detected at
  >= 0.60 confidence or its checks are dropped as "does not apply".
- Domain score and completeness index = round(100 * mean(evidence of applicable checks)).

## 5. Deterministic checks (no model, no judgement)
Recomputed in code, each citing its method: reported statistics against their p-values (after statcheck, Nuijten et al.
2016); an estimate must lie inside its own interval (Altman & Bland 2011); percentages re-derived from their counts;
means of whole-number data must be reachable with the reported n (GRIM, Brown & Heathers 2017); retractions via Crossref;
cell lines via Cellosaurus when reachable; DOIs and accessions must resolve.

## 6. Our API
- `POST /api/scan` -> NDJSON: `{"type":"domain","domain":...,"checks":[{id,p,where}]}`, then
  `{"type":"sentences","picks":{check:{para,start,end}}}`, then `{"type":"done"}`.
- `POST /api/lookup` -> `{checkedAt, crossref:{doi:{found,title,year,updates}}}`.
- `GET /api/catalogue` -> the 74 checks as JSON, so anyone can audit what is asked.

## 7. Screens (approved comps)
The Docket (ingest) - The Summation Rule + The Register (results) - The Engraved Plate (fingerprint) -
The Marginal Note (check detail with quotation) - The Instruments Annex (deterministic checks) -
The Petition (gap list + brief) - A Catalogue of Enquiries (all 74).

## 8. Rules that bind the build
- Every answer points at a paragraph and character offsets. No answer without evidence.
- No fabricated quotation, ever: a passage shown as evidence is the paper's own text.
- "Built from published reporting guidelines. Not affiliated with, or endorsed by, K-Dense." on every page and export.
- White paper, orange and blue accents, tables carry the explanations, no scroll animation on explanatory pages.

## 9. Deploy
Railway, service `viv-paper-scan`, `railway up --ci`. Env: `VENICE_API_KEY` (set by Vivek in the Railway dashboard),
`VIV_SCAN_MODEL` default `openai-gpt-6-luna`.

## 10. Out of scope
No accounts, no storage of papers, no server-side PDF handling, no paywall bypass.
