"use client";
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useScan } from './scan-provider';
import { percent } from '@/lib/format';
import { folioLabel, hasFolioAnchor } from '@/lib/folio';
import type { EnquiryResult } from '@/lib/scan-client';

type Filter = 'all' | 'bad' | 'unclear' | 'good';
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'bad', label: 'Missing or flagged' },
  { key: 'unclear', label: 'Unclear' }, { key: 'good', label: 'In good shape' },
];

/**
 * What each verdict means, in words rather than in a bar length.
 *
 * A reader should not have to infer the finding from how long a line is. Two distinctions matter
 * most here: an enquiry that was never answered must not read as an enquiry the paper failed, and a
 * warning-sign enquiry inverts, so "not seen" there is the good outcome and has to say so.
 */
const FINDING: Record<EnquiryResult['state'], string> = {
  reported: 'Reported',
  'not-seen': 'Not seen',
  missing: 'Missing',
  warning: 'Warning sign present',
  unclear: 'Unclear',
  unanswered: 'Not answered',
  pending: 'Not yet asked',
  'not-applicable': 'Does not apply to this study type',
};

export function CheckLedger() {
  const { scan } = useScan();
  const [filter, setFilter] = useState<Filter>('all');
  // Several enquiries may be open at once: comparing two findings is the ordinary way to read a ledger.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const restore = () => {
      const key = new URLSearchParams(window.location.search).get('filter');
      setFilter(filters.some((item) => item.key === key) ? key as Filter : 'all');
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function chooseFilter(key: Filter) {
    setFilter(key);
    const url = new URL(window.location.href);
    if (key === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', key);
    window.history.pushState(null, '', url);
  }

  if (!scan) return null;
  const all = scan.checks.filter((check) => check.applicable);
  const counts = { all: all.length, bad: scan.counters.bad, unclear: scan.counters.unclear, good: scan.counters.good };
  const visible = filter === 'all' ? all
    : all.filter((check) => filter === 'bad' ? ['missing', 'warning'].includes(check.state) : filter === 'unclear' ? check.state === 'unclear' : ['reported', 'not-seen'].includes(check.state));

  return <section className="ledger-section" aria-labelledby="ledger-title">
    <div className="filter-tabs" role="group" aria-label="Filter enquiries">{filters.map((item) =>
      <button type="button" key={item.key} aria-pressed={filter === item.key} onClick={() => chooseFilter(item.key)}>{item.label} {counts[item.key]}</button>)}
    </div>
    <h2 className="section-title" id="ledger-title">THE CHECK LEDGER</h2>
    <p className="ledger-hint">Select any enquiry to open its finding, its wording and the passage it rests on, without leaving this page.</p>
    <table className="check-ledger"><caption className="visually-hidden">Evidence for reporting enquiries</caption><tbody>
      {visible.map((check) => {
        const isOpen = !!open[check.id];
        const settled = !['pending', 'unanswered', 'not-applicable'].includes(check.state);
        const detailId = `ledger-detail-${check.id}`;
        return <Fragment key={check.id}>
          <tr className={isOpen ? 'ledger-open' : undefined}>
            <th scope="row">
              <button type="button" className="ledger-toggle" aria-expanded={isOpen} aria-controls={detailId}
                      onClick={() => setOpen((current) => ({ ...current, [check.id]: !current[check.id] }))}>
                {check.label}
                <span className="ledger-caret" aria-hidden="true">{isOpen ? '\u25B4' : '\u25BE'}</span>
              </button>
            </th>
            <td className="evidence-bar-cell"><span className="evidence-track"><span style={{ width: percent(check.evidence) }} /></span></td>
            <td className="ledger-percent">{['pending', 'unanswered'].includes(check.state) ? check.state : percent(check.evidence)}</td>
          </tr>
          {isOpen ? <tr className="ledger-detail-row" id={detailId}>
            <td colSpan={3}>
              <div className="ledger-detail">
                <h3>THE ENQUIRY</h3>
                <p className="ledger-question">{check.check.question}</p>
                <p className="ledger-finding-row">
                  <strong>{FINDING[check.state]}</strong>
                  {settled ? <span className="ledger-evidence-value"> — evidence {percent(check.evidence)} of what is expected</span> : null}
                </p>
                {check.passage
                  ? <blockquote className="ledger-quote">
                      <p>{check.passage.quote}</p>
                      <cite>{folioLabel(check.passage, scan.paragraphs)}</cite>
                    </blockquote>
                  /* A quotation the server could not locate is never shown: say so rather than
                     dress the absence up as evidence. */
                  : <p className="ledger-quote-empty">
                      {check.applicable
                        ? 'No passage in this paper could be matched to this enquiry, so none is shown here.'
                        : 'This enquiry is not asked of this study type.'}
                    </p>}
                <div className="ledger-actions">
                  {check.passage && hasFolioAnchor(check.passage)
                    ? <Link className="folio-link" href={`/check/${check.id}#folio-${check.passage.page}`}>Show it on the page</Link>
                    : null}
                  <Link className="folio-link" href={`/check/${check.id}`}>Go deeper: the full marginal note</Link>
                </div>
              </div>
            </td>
          </tr> : null}
        </Fragment>;
      })}
    </tbody></table>
  </section>;
}
