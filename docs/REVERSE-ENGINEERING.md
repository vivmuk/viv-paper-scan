# viv-paper-scan — reverse-engineering record of Rigor Scan

Evidence-first record of how K-Dense's Rigor Scan works, captured with REA against the live site on
2026-10-17. Everything here was observed, not guessed. Artefacts: `recon/web-bundle.json` (REA bundle
analysis), `recon/api-traffic.json` (real requests and responses), `recon/scan-stream.txt` (the raw
streamed answer), `recon/checks-catalog.json` (the 74-check catalogue),
`recon/bundles/a691ec2ba3d7c87b.js` (the client bundle holding the rules).

## 1. What the tool is

A free reporting-completeness check for research papers. Drop in a PDF; it answers a fixed list of
74 yes/no reporting questions across six domains, scores them, and points each answer at the
sentence it rests on. It measures how completely a paper *reports* what it did. It does not judge
whether the findings are right.

## 2. The protocol (observed on the wire)

Two endpoints, both POST, both JSON.

### 2.1 `POST /api/rigor-scan/scan`

Request — the paper is parsed **in the browser**; only tagged text leaves the device:

```json
{"paragraphs": [{"id": "P001", "section": "front", "text": "RESEARCH ARTICLE Type of anesthesia..."},
               {"id": "P002", "section": "abstract", "text": "..."}]}
```
The captured scan of a 16-page PLOS ONE paper sent 58 paragraphs / 41,654 bytes.

Response — **newline-delimited JSON, streamed**, one object per domain, in this order:

```json
{"type":"domain","domain":"openness","ms":291,
  "checks":{"data_statement":{"p":0.99,"where":[["P006",1]]},
            "code_available":{"p":0.22,"where":[["P006",0.5],["P031",0.46]]}}}
{"type":"sentences","ms":175,
  "picks":{"data_statement":{"para":"P006","start":0,"end":97,"confidence":1}}}
{"type":"done"}
```

- `p` = probability that the paper reports that item.
- `where` = paragraph id plus weight per check. This is the evidence pointer and the reason a
  result can be shown on the page.
- `sentences.picks` = exact character offsets of the evidence sentence inside that paragraph.
- The whole scan returned in **0.84 s**, 8,724 bytes, six domains in ~1.9 s of summed work.
- The connection stays open well past the last line, so the client reads a stream, not a document.

### 2.2 `POST /api/rigor-scan/lookup`

Request: `{dois:[43], pmids:[44], citations:[{n,text}], links:[{kind,value}], cells:[...]}`
Response: `{checkedAt, crossref:{"<doi>":{found,title,year,updates}}, ...}`

This is the identifier and retraction pass: Crossref, PubMed, the Retraction Watch database,
Cellosaurus (cell line accession plus STR profile), Zenodo, GitHub, GEO, SRA, PRIDE,
ClinicalTrials.gov and SciCrunch RRIDs. A short token only counts as a cell line when the words
"cell line" appear within 40 characters of it.

## 3. The catalogue: 74 checks, six domains

Extracted from the client bundle and cross-checked against the stream: **74 in the catalogue,
74 in the stream, zero id differences, zero domain mismatches.**

| domain | checks |
|---|---|
| stats (17) | `tests_named`, `unit_of_analysis`, `assumptions`, `multiple_comparisons`, `uncertainty`, `effect_size`, `error_bars`, `stats_software`, `significance_only`, `confounders`, `missing_data`, `holdout`, `leakage`, `baseline`, `external_validation`, `fdr`, `batch_effects` |
| design (15) | `hypothesis`, `primary_outcome`, `control_group`, `n_per_group`, `sample_size_rationale`, `randomization`, `randomization_method`, `blinding_allocation`, `blinding_outcome`, `inclusion_criteria`, `exclusions_reported`, `replication`, `replicate_type`, `trial_registration`, `allocation_concealment` |
| materials (12) | `species_strain`, `animal_sex`, `animal_age`, `animal_source`, `housing`, `cell_source`, `cell_authentication`, `mycoplasma`, `antibody_ids`, `reagent_sources`, `doses`, `instruments` |
| ethics (11) | `ethics_approval`, `approval_number`, `consent`, `humane_endpoints`, `analgesia`, `euthanasia`, `funding`, `funder_role`, `competing_interests`, `contributions`, `guideline_named` |
| openness (10) | `data_statement`, `data_repository`, `data_on_request`, `code_available`, `code_link`, `protocol_shared`, `preregistration`, `supplement`, `raw_data`, `omics_accession` |
| claims (9) | `limitations`, `prior_work`, `alternatives`, `null_results`, `translation_caveat`, `causal_overreach`, `overgeneralization`, `future_work`, `adverse_events` |

Each check is a tuple of `(domain, id, label, question, {module, guideline, polarity})`:

- **module** — the study types the check applies to (45 of 74 checks are gated).
  Study types: `all, empirical, intervention, antibodies, animals, cells, humans, trial, ml, omics`.
- **guideline** — the upstream checklist item it comes from (15 checks tagged, all ARRIVE items).
- **polarity** — `good` (default) or `flag`. A flagged check is a warning sign, so *finding* it lowers
  the score. There are four: `significance_only, data_on_request, causal_overreach, overgeneralization`.

Six of the study types are detected by asking the paper a question of its own (`animals`, `humans`,
`trial`, `cells`, `antibodies`, `omics`), for example *"Does the paper report experiments performed on
live animals?"* A study type below the gate is treated as absent and its checks are dropped from every
score.

## 4. The scoring rules

Recovered from the bundle and consistent with what the site publishes:

- `THRESHOLDS = {found: 0.7, absent: 0.35, gate: 0.6}`
- A check is **Reported** at `>= 0.70`, **Missing** below `0.35`, **Unclear** in between.
- For a flagged check the value is inverted first (`1 - p`), and the labels become
  **Not seen** / **Unclear** / **Warning sign found**.
- A study type counts as present at `>= 0.60`; its checks are otherwise skipped.
- A domain score is `round(100 * mean(evidence))` over its applicable checks. The headline
  "Completeness index" is the same average over every applicable check.
- Spoke length in the fingerprint equals evidence that the item is reported.

## 5. The software checks (no model involved)

Besides the model answers, the bundle runs deterministic maths and identifier checks:

| kind | what it does |
|---|---|
| `grim` | recomputes whether a reported mean is achievable for its n; *"No whole-number total gives a mean of X with n = Y"* |
| p-value recomputation | parses `t(df)=x, p=y` and recomputes p; flags when the recomputed p crosses 0.05 or differs |
| `percent` | re-derives percentages and flags arithmetic that does not match |
| `ratio` | checks estimate/interval/p-value agreement, reporting an implied p |
| identifier kinds | `doi, geo, github, pride, rrid, sra, trial, protocol` |

## 6. The presentation

Six domain tiles with an index each, a "rigor fingerprint" radial with one spoke per applicable check,
four counters (in good shape / unclear / missing or flagged / don't apply), a filterable check list
whose rows expand to show the question, the evidence quote and a "Show on page" jump, a summary card
and a shareable permalink (`/tools/rigor-scan/r/<id>`). Progress captions run in four steps, and the
scan honours `prefers-reduced-motion`.

## 7. What we are NOT copying

The wording of the questions, the labels and the presentation are K-Dense's work and their site is
"All rights reserved". This rebuild therefore:

1. derives its checklist from the **same public upstream** the tool itself names — ARRIVE 2.0 and the
   common journal reporting checklists — and writes **our own question wording** for every item;
2. keeps a **provenance field per check** (which published guideline item it comes from), so every
   question is traceable to a public source rather than to a competitor's phrasing;
3. reimplements the **published** scoring thresholds and the evidence-pointer idea as a design input,
   which is the interoperability part of the reverse engineering;
4. credits Rigor Scan and K-Dense as the tool that showed the shape, and TypeSafe's Jev as its engine,
   in the README and on the page.

The engine changes too: **Venice models answer the checks instead of Jev**, which is what makes an
independent open-source version possible at all.
