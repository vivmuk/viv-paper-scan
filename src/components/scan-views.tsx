'use client';
import { useEffect, useState } from 'react';
import { Counters, DomainRegister, DomainLegend, MarginalNote, Masthead } from './almanac';
import { CheckLedger } from './check-ledger';
import { RadialPlate } from './radial-plate';
import { ScanStatus } from './scan-status';
import { useScan } from './scan-provider';

export function RegisterView() {
  const { scan } = useScan();
  return <><ScanStatus />{scan && <div className="spread register-spread">
    <section>
      <header className="summation-band"><h1>THE SUMMATION RULE</h1><div><strong>{scan.index ?? '—'}</strong><span>COMPLETENESS INDEX</span></div></header>
      <Counters /><DomainRegister /><CheckLedger />
    </section>
    <aside className="margin-column register-margin"><RadialPlate compact /><MarginalNote /></aside>
  </div>}</>;
}
export function PlateView() {
  const { scan } = useScan();
  return <><ScanStatus />{scan && <><div className="spread plate-spread">
    <figure className="engraved-figure"><RadialPlate /><figcaption className="plate-caption phone-plate-caption">THE ENGRAVED PLATE - SPOKE LENGTH IS THE EVIDENCE THAT IT IS REPORTED</figcaption></figure>
    <aside className="margin-column plate-margin"><DomainLegend /><div className="phone-marginal-note"><MarginalNote /></div></aside>
  </div><div className="plate-counters"><Counters /></div></>}</>;
}
export function CheckView({ id }: { id: string }) {
  const { scan } = useScan();
  const result = scan?.checks.find(check => check.id === id);
  const passage = result?.passage;
  const paragraph = passage && scan?.paragraphs.find(p => p.id === passage.para);
  const [hash, setHash] = useState('');
  useEffect(() => {
    const restore = () => setHash(window.location.hash);
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, [id]);
  return <><ScanStatus />{result && <div className="spread detail-spread">
    <section><Masthead>THE MARGINAL NOTE</Masthead><MarginalNote result={result} detail />
      {paragraph && passage && <section className="folio-excerpt" style={hash === `#folio-${passage.page}` ? { display: 'block' } : undefined} id={`folio-${passage.page}`} aria-labelledby="folio-heading">
        <h2 className="section-title" id="folio-heading">{passage.section} - Folio {passage.page}</h2>
        <p><span>{paragraph.text.slice(0, passage.start)}</span><mark>{paragraph.text.slice(passage.start, passage.end)}</mark><span>{paragraph.text.slice(passage.end)}</span></p>
      </section>}
    </section>
    <aside className="margin-column detail-margin"><RadialPlate compact /></aside>
  </div>}</>;
}
