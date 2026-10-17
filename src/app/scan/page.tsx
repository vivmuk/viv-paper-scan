import type { Metadata } from 'next';
import { Counters, DemoNotice, DomainRegister, MarginalNote } from '@/components/almanac';
import { CheckLedger } from '@/components/check-ledger';
import { RadialPlate } from '@/components/radial-plate';
import { DEMO_SCAN } from '@/lib/fixtures';
export const metadata: Metadata = { title: 'The Register' };
// TODO: POST /api/scan; adapt streamed domain/sentences events to ScanPresentation.
export default function ScanPage() {
  return <><DemoNotice /><div className="spread register-spread">
    <section>
      <header className="summation-band"><h1>THE SUMMATION RULE</h1><div><strong>{DEMO_SCAN.index}</strong><span>COMPLETENESS INDEX</span></div></header>
      <Counters /><DomainRegister /><CheckLedger />
    </section>
    <aside className="margin-column register-margin"><RadialPlate compact /><MarginalNote /></aside>
  </div></>;
}
