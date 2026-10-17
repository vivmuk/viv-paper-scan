import type { Metadata } from 'next';
import { DemoNotice, Masthead } from '@/components/almanac';
import { INSTRUMENTS } from '@/lib/fixtures';
export const metadata: Metadata = { title: 'The Instruments Annex' };
// TODO: POST /api/lookup for public registers; combine with browser-side arithmetic results.
export default function AnnexPage() {
  return <div className="document-page annex-page"><DemoNotice /><Masthead>THE INSTRUMENTS ANNEX</Masthead>
    <p className="document-intro">Settled by arithmetic and public registers, not by judgement.</p>
    <table className="ruled-table annex-table"><caption className="visually-hidden">Checks settled by arithmetic and public registers</caption>
      <colgroup><col className="number-col" /><col /><col className="state-col" /></colgroup>
      <thead><tr><th scope="col">No.</th><th scope="col">Check</th><th scope="col">State</th></tr></thead>
      <tbody>{INSTRUMENTS.map((row) => <tr key={row.numeral}>
        <td className="roman">{row.numeral}</td><th scope="row"><h2>{row.title}</h2><p>{row.method}</p></th><td className="instrument-state">{row.state}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
