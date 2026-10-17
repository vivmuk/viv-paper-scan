import type { Metadata } from 'next';
import { Masthead, WarningMark } from '@/components/almanac';
import { CopyCatalogue } from '@/components/copy-catalogue';
import { PRINTED_CATALOGUE } from '@/lib/fixtures';
import { roman } from '@/lib/format';
export const metadata: Metadata = { title: 'A Catalogue of Enquiries' };
// TODO: GET /api/catalogue; replace the imported catalogue with the same typed response.
export default function CataloguePage() {
  return <div className="document-page catalogue-page"><Masthead large>A CATALOGUE OF ENQUIRIES</Masthead>
    <p className="document-intro">All seventy-four questions, printed in full. Nothing is asked that is not listed here.</p>
    <table className="ruled-table catalogue-table"><caption className="visually-hidden">All seventy-four published reporting enquiries</caption>
      <colgroup><col className="number-col" /><col /><col className="tag-col" /></colgroup>
      <thead><tr><th scope="col">No.</th><th scope="col">Question</th><th scope="col">Tag</th></tr></thead>
      <tbody>{PRINTED_CATALOGUE.map((entry, i) => <tr key={entry.check.id}>
        <td className="roman">{roman(i + 1).toLowerCase()}</td><th scope="row">{entry.question}</th>
        <td><span className={entry.tag === '-' ? '' : 'guideline-tag'} title={entry.check.provenance}>{entry.tag}</span>
          {entry.check.polarity === 'flag' && <span className="warning-label"><WarningMark />warning sign</span>}
        </td>
      </tr>)}</tbody>
    </table><CopyCatalogue />
  </div>;
}
