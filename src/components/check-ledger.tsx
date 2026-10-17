"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEMO_SCAN, LEDGER_IDS } from '@/lib/fixtures';
import { percent } from '@/lib/format';
type Filter = 'all' | 'bad' | 'unclear' | 'good';
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All 61' }, { key: 'bad', label: 'Missing or flagged 12' },
  { key: 'unclear', label: 'Unclear 2' }, { key: 'good', label: 'In good shape 47' },
];
export function CheckLedger() {
  const [filter, setFilter] = useState<Filter>('all');
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
  const all = DEMO_SCAN.checks.filter((check) => check.applicable);
  const visible = filter === 'all' ? LEDGER_IDS.map((id) => all.find((check) => check.id === id)!)
    : all.filter((check) => filter === 'bad' ? ['missing', 'warning'].includes(check.state) : filter === 'unclear' ? check.state === 'unclear' : ['reported', 'not-seen'].includes(check.state));
  return <section className="ledger-section" aria-labelledby="ledger-title">
    <div className="filter-tabs" role="group" aria-label="Filter enquiries">{filters.map((item) =>
      <button type="button" key={item.key} aria-pressed={filter === item.key} onClick={() => chooseFilter(item.key)}>{item.label}</button>)}
    </div>
    <h2 className="section-title" id="ledger-title">THE CHECK LEDGER</h2>
    <table className="check-ledger"><caption className="visually-hidden">Evidence for reporting enquiries</caption><tbody>
      {visible.map((check) => <tr key={check.id}>
        <th scope="row"><Link href={`/check/${check.id}`}>{check.label}</Link></th>
        <td className="evidence-bar-cell"><span className="evidence-track"><span style={{ width: percent(check.evidence) }} /></span></td>
        <td className="ledger-percent">{percent(check.evidence)}</td>
      </tr>)}
    </tbody></table>
  </section>;
}
