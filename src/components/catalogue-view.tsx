'use client';
import { useEffect, useState } from 'react';
import { Masthead, WarningMark } from './almanac';
import { CopyCatalogue } from './copy-catalogue';
import { PRINTED_CATALOGUE } from '@/lib/fixtures';
import { roman } from '@/lib/format';
import type { PublishedCatalogue } from '@/lib/catalogue-client';
export function CatalogueView() {
  const [catalogue, setCatalogue] = useState<PublishedCatalogue | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    setError('');
    void fetch('/api/catalogue', { signal: request.signal }).then(async response => {
      if (!response.ok) throw new Error(`The catalogue could not be loaded (${response.status}).`);
      const result = await response.json() as PublishedCatalogue;
      if (!Array.isArray(result.checks) || result.count !== result.checks.length) throw new Error('The published catalogue was incomplete.');
      setCatalogue(result);
    }).catch(err => { if (!request.signal.aborted) setError(err instanceof Error ? err.message : 'The catalogue could not be loaded.'); });
    return () => request.abort();
  }, [attempt]);
  const entries = catalogue ? [
    ...PRINTED_CATALOGUE.filter(entry => catalogue.checks.some(c => c.id === entry.check.id)).map(entry => ({ ...entry, check: catalogue.checks.find(c => c.id === entry.check.id)! })),
    ...catalogue.checks.filter(c => !PRINTED_CATALOGUE.some(e => e.check.id === c.id)).map(check => ({ check, question: check.question, tag: check.guidelines.join(', ') || '-' })),
  ] : [];
  return <div className="document-page catalogue-page"><Masthead large>A CATALOGUE OF ENQUIRIES</Masthead>
    <p className="document-intro">All seventy-four questions, printed in full. Nothing is asked that is not listed here.</p>
    {!catalogue && <p role="status" className="input-status">{error || 'Loading the published catalogue…'}</p>}
    {error && <button className="blue-button" type="button" onClick={() => setAttempt(n => n + 1)}>Retry catalogue</button>}
    {catalogue && <><table className="ruled-table catalogue-table"><caption className="visually-hidden">All seventy-four published reporting enquiries</caption>
      <colgroup><col className="number-col" /><col /><col className="tag-col" /></colgroup>
      <thead><tr><th scope="col">No.</th><th scope="col">Question</th><th scope="col">Tag</th></tr></thead>
      <tbody>{entries.map((entry, i) => <tr key={entry.check.id}>
        <td className="roman">{roman(i + 1).toLowerCase()}</td><th scope="row">{entry.question}</th>
        <td><span className={entry.tag === '-' ? '' : 'guideline-tag'} title={entry.check.provenance}>{entry.tag}</span>
          {entry.check.polarity === 'flag' && <span className="warning-label"><WarningMark />warning sign</span>}
        </td>
      </tr>)}</tbody>
    </table><CopyCatalogue catalogue={catalogue} /></>}
  </div>;
}
