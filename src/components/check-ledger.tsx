"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useScan } from './scan-provider';
import { percent } from '@/lib/format';
type Filter = 'all' | 'bad' | 'unclear' | 'good';
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'bad', label: 'Missing or flagged' },
  { key: 'unclear', label: 'Unclear' }, { key: 'good', label: 'In good shape' },
];
export function CheckLedger() {
  const { scan } = useScan();
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
    <table className="check-ledger"><caption className="visually-hidden">Evidence for reporting enquiries</caption><tbody>
      {visible.map((check) => <tr key={check.id}>
        <th scope="row"><Link href={`/check/${check.id}`}>{check.label}</Link></th>
        <td className="evidence-bar-cell"><span className="evidence-track"><span style={{ width: percent(check.evidence) }} /></span></td>
        <td className="ledger-percent">{['pending', 'unanswered'].includes(check.state) ? check.state : percent(check.evidence)}</td>
      </tr>)}
    </tbody></table>
  </section>;
}
