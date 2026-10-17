import type { Metadata } from 'next';
import { Counters, DemoNotice, DomainLegend, MarginalNote } from '@/components/almanac';
import { RadialPlate } from '@/components/radial-plate';
export const metadata: Metadata = { title: 'The Engraved Plate' };
// TODO: POST /api/scan; draw one spoke per catalogue check using streamed evidence.
export default function PlatePage() {
  return <><DemoNotice /><div className="spread plate-spread">
    <figure className="engraved-figure"><RadialPlate /><figcaption className="plate-caption phone-plate-caption">THE ENGRAVED PLATE - SPOKE LENGTH IS THE EVIDENCE THAT IT IS REPORTED</figcaption></figure>
    <aside className="margin-column plate-margin"><DomainLegend /><div className="phone-marginal-note"><MarginalNote /></div></aside>
  </div><div className="plate-counters"><Counters /></div></>;
}
