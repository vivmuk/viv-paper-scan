# viv-paper-scan

An open-source reporting-completeness scanner for research papers, presented as a Victorian almanac.

Drop in a PDF. The scanner answers a fixed catalogue of **74 reporting enquiries** across six domains,
returns a completeness index, and shows — for every answer — **the sentence in the paper it rests on**.

## What it does

- Parses the PDF **in your browser**; the file itself never leaves your device.
- Asks 74 enquiries about study design, statistics, materials, data & code, ethics & disclosure, and claims.
- Each enquiry returns a probability that the item *is reported*, two thresholds turn that into a verdict,
  and the evidence is a pointer to the paragraph and character offsets behind the answer.
- Four **warning-sign** enquiries invert, because for those the finding of the problem is itself the bad news.
- 45 enquiries are gated by study type: cell-line questions are not asked of a mouse study.
- Separately, some claims are settled by **arithmetic and public registers, not by judgement** —
  reported statistics recomputed against their p-values, percentages re-derived from their counts,
  means of whole-number data checked for reachability, retractions and identifiers resolved.

## Provenance, and what is deliberately not copied

The wire protocol was reverse-engineered from K-Dense's hosted Rigor Scan by capturing its own browser
traffic, and reimplemented independently. **Their wording is not used.** Every enquiry here is our own
composition, derived from the published upstream the same tool cites — principally **ARRIVE 2.0** (NC3Rs),
with a provenance field recording the guideline item for each check. A test mechanically enforces this:
no question may share a run of eight consecutive words with the reference tool's text.

The reference implementation delegates its judgement step to Jev (TypeSafe). This build uses the
**Venice API** instead.

**Not affiliated with, or endorsed by, K-Dense.**

## Running it

```bash
npm install
npm test          # engine, catalogue and arithmetic tests; no network needed
npm run dev
```

Environment:

- `VENICE_API_KEY` — required for scanning. Server-side only; it is never sent to the browser.
- `VIV_SCAN_MODEL` — optional, defaults to `openai-gpt-6-luna`.

## Layout

- `src/lib/engine.ts` — scoring: thresholds, verdicts, gating, tallies
- `src/lib/catalogue.ts` — the 74 enquiries in our own wording
- `src/lib/arithmetic.ts` — the checks settled by arithmetic rather than judgement
- `docs/SPEC.md` — the build specification
- `docs/REVERSE-ENGINEERING.md` — the recovered protocol, with evidence
- `recon/` — the captured evidence: API traffic, the check catalogue, script bundles

## Licence

MIT. See `LICENSE`.
