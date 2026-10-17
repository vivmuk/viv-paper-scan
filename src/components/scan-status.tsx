'use client';
import Link from 'next/link';
import { useScan } from './scan-provider';

export function ScanStatus() {
  const { session, scan, cancel, retry } = useScan();
  if (!scan) return <p className="no-passage">No paper is open. <Link href="/">Choose a PDF on the Docket</Link>. Results stay in this tab while you turn the pages; reloading clears them.</p>;
  if (scan.demonstration) return <p className="demo-notice">Demonstration data</p>;
  return <section className="scan-status" aria-label="Scan progress">
    <p>{scan.paper.title}</p>
    <table className="ruled-table"><tbody>
      <tr><th scope="row">Scan</th><td role="status">{session?.status === 'scanning' ? `Reading the reporting enquiries — ${session.domains.length} of 6 domains received` : session?.status === 'complete' ? 'Complete' : session?.error}</td></tr>
      <tr><th scope="row">Enquiries</th><td>{scan.counters.good + scan.counters.unclear + scan.counters.bad} answered; {scan.pending} pending; {scan.unanswered} unanswered; {scan.counters.notApplicable} do not apply</td></tr>
      {session?.notes.map((note, i) => <tr key={i}><th scope="row">Note</th><td>{note}</td></tr>)}
    </tbody></table>
    {session?.status === 'scanning' ? <button className="blue-button" type="button" onClick={cancel}>Cancel scan</button> : session?.status !== 'complete' ? <button className="blue-button" type="button" onClick={retry}>Retry scan</button> : null}
  </section>;
}
export function SpecimenLink() {
  const { specimen } = useScan();
  return <Link className="specimen-link" href="/scan" onClick={specimen}>Open the specimen <span aria-hidden="true">↗</span></Link>;
}
