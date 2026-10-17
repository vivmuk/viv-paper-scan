import type { Metadata } from 'next';
import { SpecimenLink } from '@/components/scan-status';
import { Masthead } from '@/components/almanac';
import { DropSlot } from '@/components/drop-slot';
import { PRIVACY_LINE } from '@/lib/fixtures';
export const metadata: Metadata = { title: 'The Docket' };
export default function DocketPage() {
  return <div className="spread docket-spread">
    <section className="docket-main">
      <Masthead>VIV-PAPER-SCAN</Masthead>
      <h2 className="docket-headline"><span>Drop in a paper.</span><span>See what it fails to report.</span></h2>
      <p className="docket-deck">Seventy-four published reporting questions.<br />Every answer points to the sentence it rests on.</p>
      <DropSlot />
      <p className="privacy-line privacy-mobile">{PRIVACY_LINE}</p>
    </section>
    <aside className="margin-column docket-margin">
      <section className="specimen-box"><h2 className="section-title">A SPECIMEN PAPER</h2>
        <p>Dubowitz et al. - PLOS ONE - 2023</p><SpecimenLink />
      </section>
      <p className="privacy-line privacy-desktop">{PRIVACY_LINE}</p>
    </aside>
  </div>;
}
