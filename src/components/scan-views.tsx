'use client';
import { Counters, DomainRegister, DomainLegend, MarginalNote, Masthead } from './almanac';
import { CheckLedger } from './check-ledger';
import { RadialPlate } from './radial-plate';
import { ScanStatus } from './scan-status';
import { useScan } from './scan-provider';
import { folioPlace, sectionLabel } from '@/lib/folio';

export function RegisterView() {
  const { scan } = useScan();
  return <><ScanStatus />{scan && <div className="spread register-spread">
    <section>
      <header className="summation-band"><h1>THE SUMMATION RULE</h1><div><strong>{scan.index ?? '—'}</strong><span>COMPLETENESS INDEX</span></div></header>
      <Counters />
      {/* The plate belongs above the ledger at full size: the point of it is comparing how far each
          category has come, which a 230px thumbnail in the margin cannot show. */}
      <figure className="engraved-figure register-plate">
        <RadialPlate />
        <figcaption className="plate-caption">THE ENGRAVED PLATE - SPOKE LENGTH IS THE EVIDENCE THAT IT IS REPORTED. AN ARC ACROSS EACH DOMAIN'S WEDGE IS THAT DOMAIN'S SCORE.</figcaption>
      </figure>
      <DomainRegister /><CheckLedger />
    </section>
    <aside className="margin-column register-margin"><MarginalNote /></aside>
  </div>}</>;
}
export function PlateView() {
  const { scan } = useScan();
  return <><ScanStatus />{scan && <><div className="spread plate-spread">
    <figure className="engraved-figure"><RadialPlate /><figcaption className="plate-caption phone-plate-caption">THE ENGRAVED PLATE - SPOKE LENGTH IS THE EVIDENCE THAT IT IS REPORTED</figcaption></figure>
    <aside className="margin-column plate-margin"><DomainLegend /><div className="phone-marginal-note"><MarginalNote /></div></aside>
  </div><div className="plate-counters"><Counters /></div></>}</>;
}

/**
 * The passage as it sits in the paper.
 *
 * This is rendered whenever a passage exists, not only when the URL carries the matching anchor.
 * Hiding it behind an exact hash meant a reader browsing from the ledger never saw the sentence in
 * its place, which is the whole point of citing it. The anchor id is now present for every paper,
 * paginated or not, so the link from a marginal note always lands here; arriving with the hash
 * simply scrolls to it.
 */
export function CheckView({ id }: { id: string }) {
  const { scan } = useScan();
  const result = scan?.checks.find(check => check.id === id);
  const passage = result?.passage;
  const paragraph = passage && scan?.paragraphs.find(p => p.id === passage.para);
  return <><ScanStatus />{result && <div className="spread detail-spread">
    <section><Masthead>THE MARGINAL NOTE</Masthead><MarginalNote result={result} detail />
      {paragraph && passage && scan && <section className="folio-excerpt" id={`folio-${passage.page}`} aria-labelledby="folio-heading">
        <h2 className="section-title" id="folio-heading">IN THE PAPER: {sectionLabel(passage.section)}</h2>
        <p className="folio-place">{folioPlace(passage, scan.paragraphs)}</p>
        <p><span>{paragraph.text.slice(0, passage.start)}</span><mark>{paragraph.text.slice(passage.start, passage.end)}</mark><span>{paragraph.text.slice(passage.end)}</span></p>
      </section>}
    </section>
    <aside className="margin-column detail-margin"><RadialPlate compact /></aside>
  </div>}</>;
}
