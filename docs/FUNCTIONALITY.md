# viv-paper-scan — functional parity inventory

Every user-visible capability of the target, extracted from its client bundle and its live behaviour,
with the venue where it reappears in the Almanac. Captured 2026-10-17.

## A. Ingest

| # | Function | Observed detail | Almanac home |
|---|---|---|---|
| A1 | Drop or choose a PDF | input `#rs-file`, accepts `application/pdf,.pdf` | the Docket: a ruled drop-slot |
| A2 | Read on device | PDF parsed in the browser by pdf.js; only text leaves | stated in the Docket's foot-rule |
| A3 | Nothing saved | the page says so twice; no store call was observed | stated in the Docket's foot-rule |
| A4 | Example paper | Dubowitz et al., PLOS ONE 2023, loads by default | "A Specimen Paper" |
| A5 | Section tagging | each paragraph carries `section` + `id` (`P001`) | the paragraph is the citation unit throughout |
| A6 | Paragraph extraction | 58 paragraphs from a 16-page paper | the Almanac's numbered stanzas |

## B. Study-type detection (9 types, each a question with both outcomes explained)

`empirical` (new experimental data) · `intervention` (assigned treatments) · `animals` · `humans` ·
`trial` · `cells` · `antibodies` · `ml` (prediction models) · `omics`
Plus two **judgments** on a four-level scale: *methods procedural detail* (Minimal / Partial /
Detailed / Protocol-level) and *strength of the abstract's claim* (Tentative / Measured / Confident /
Sweeping).

Venue: the **Prospectus Table** — "What manner of study this is", each type struck or confirmed.

## C. The scan

| # | Function | Observed detail |
|---|---|---|
| C1 | Streamed results | NDJSON: `queue`, `domain`, `sentences`, `error`, `done` |
| C2 | Per-check answer | `p` = probability the item is reported |
| C3 | Evidence pointer | `where`: paragraph id + weight per check |
| C4 | Evidence sentence | `sentences.picks`: exact `start`/`end` offsets |
| C5 | Four progress steps | queue caption, "Looking up identifiers…", "Linking each result to its sentence…", "Scan complete." |
| C6 | Cancellable | aborts on unmount; honours `prefers-reduced-motion` |
| C7 | Failure states | "The scan stopped.", "The scan couldn't finish. Try again." |

## D. Results

| # | Function | Observed detail | Almanac home |
|---|---|---|---|
| D1 | Completeness index | mean evidence over applicable checks, 0-100 | the Summation Rule |
| D2 | Four counters | in good shape / unclear / missing or flagged / don't apply | the Tally Row |
| D3 | Fingerprint | one spoke per applicable check, length = evidence | the Engraved Plate |
| D4 | Six domain scores | `round(100 x mean(evidence))` | the six-column Register |
| D5 | Filter tabs | All / Missing or flagged / Unclear / In good shape | the Register's margin tabs |
| D6 | Per-check evidence % | shown on every row | the Ledger column |
| D7 | Expand a check | question, evidence quote, source line | the Marginal Note |
| D8 | Status wording | Reported / Unclear / Missing, and for warning signs Not seen / Unclear / Warning sign found | same, almanac voice |
| D9 | "N of M in good shape" | per domain | per Register column |
| D10 | Skipped state | "This paper doesn't include these kinds of study, so their checks are left out of the score." | the Register's excluded rows |
| D11 | Evidence phrasing | "Passage in question:", "No sign of this. Closest passage:", "Partly addressed here:", "Not found. Closest passage:" | the Marginal Note |
| D12 | "Show on page" | jumps the PDF viewer to the sentence | the folio reference |

## E. Checks done by software (no model)

| # | Function | Method credit (as published) |
|---|---|---|
| E1 | Reported statistics | statcheck, Nuijten et al. 2016, Behavior Research Methods |
| E2 | Ratios and intervals | Altman & Bland 2011, BMJ 343:d2090 |
| E3 | Percentages with counts | arithmetic re-derivation |
| E4 | Means of whole-number data | GRIM, Brown & Heathers 2017 |
| E5 | Retractions and notices | Crossref REST API, Retraction Watch, NCBI E-utilities |
| E6 | Cell line register | Cellosaurus (SIB), CC BY 4.0: contaminated, misidentified, misclassified, plus STR |
| E7 | Data, code, registries | doi.org, Zenodo, GitHub, NCBI GEO, ClinicalTrials.gov, SciCrunch RRIDs |
| E8 | Empty/negative states | "Nothing to recompute", "No retracted references", "No cell lines named", "No data links to open", "Lookups didn't finish", "Couldn't reach the databases" |

Venue: the **Instruments Annex** — "checked by arithmetic and register, not by judgement".

## F. The hand-off

| # | Function | Observed detail |
|---|---|---|
| F1 | Gap list with checkboxes | pick which gaps to send |
| F2 | A fix action per check | ~40 prewritten actions, e.g. "Run a power analysis…", "Describe the randomization", "Draft a blinding statement", "Prepare data for deposit" |
| F3 | Brief textarea | assembled from fixed templates, paper text excluded |
| F4 | Title/DOI toggle | "Include the paper's title and DOI. Leave this off for unpublished work." |
| F5 | Copy and open | "Copy brief and open K-Dense Web" |
| F6 | Reassurance | "Your paper isn't sent." |

Venue: the **Petition** — a written request to one's own laboratory, listing the deficiencies.

## G. Sharing and records

| # | Function |
|---|---|
| G1 | Share image 1200x630: fingerprint, index, domain scores |
| G2 | Title/DOI toggle for the image |
| G3 | Permalink `/r/<id>` |
| G4 | "Links and images carry the scores only. They never include your PDF or the paper's text." |
| G5 | Clipboard fallback toast |

Venue: the **Broadsheet** — a printed notice, with the same "scores only" assurance.

## H. The published checklist

All 74 checks in one table with domain, question, ARRIVE item tag, study types, warning-sign marks,
plus the scoring rules and the "what leaves your device" section; "Copy checklist as JSON".

Venue: the **Catalogue of Enquiries** — the full 74, printed as an almanac index.

## I. Presentation rules inherited

- Explanations carried by tables, no scroll animation, light theme default, white with orange and blue.
- Four counters, six domain columns, the index as the headline figure.
- Every result links to its paragraph and sentence.
