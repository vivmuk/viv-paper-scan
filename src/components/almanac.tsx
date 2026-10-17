import Link from 'next/link';
import { DEMO_CHECKS, DEMO_SCAN, DISCLOSURE, CELL_NOTE_QUESTION, type EnquiryResult } from '@/lib/fixtures';
import { percent } from '@/lib/format';

export function Masthead({ children, large = false }: { children: React.ReactNode; large?: boolean }) {
  return <h1 className={`masthead${large ? ' masthead-large' : ''}`}>{children}</h1>;
}
export function DemoNotice() { return <p className="demo-notice">Demonstration data</p>; }
export function Footer() {
  return <footer className="foot-rule">
    <nav aria-label="Folio navigation">
      <Link href="/">The Docket</Link><Link href="/scan">The Register</Link>
      <Link href="/plate">The Engraved Plate</Link><Link href="/annex">The Instruments Annex</Link>
      <Link href="/petition">The Petition</Link><Link href="/catalogue">A Catalogue of Enquiries</Link>
    </nav>
    <p>{DISCLOSURE}</p>
  </footer>;
}
export function Counters() {
  const counts = DEMO_SCAN.counters;
  return <table className="counters" aria-label="Reporting completeness counts"><tbody><tr>
    <td><strong>{counts.good}</strong><span>in good shape</span></td>
    <td><strong>{counts.unclear}</strong><span>unclear</span></td>
    <td><strong>{counts.bad}</strong><span>missing or flagged</span></td>
    <td><strong>{counts.notApplicable}</strong><span>do not apply</span></td>
  </tr></tbody></table>;
}
export function DomainRegister() {
  return <section aria-labelledby="register-heading" className="domain-register">
    <h2 id="register-heading" className="section-title">THE REGISTER</h2>
    <table className="domain-columns"><caption className="visually-hidden">Domain completeness scores</caption><tbody><tr>
      {DEMO_SCAN.domains.map((domain) => <td key={domain.id}>
        <span className="roman">{domain.numeral}</span><span className="domain-name">{domain.title}</span>
        <strong className="domain-score">{domain.score}</strong>
        <span className="domain-count">{domain.good} of {domain.applicable}</span>
      </td>)}
    </tr></tbody></table>
  </section>;
}
export function DomainLegend() {
  return <section className="domain-legend" aria-labelledby="legend-heading">
    <h1 id="legend-heading" className="section-title">DOMAINS &amp; SCORES</h1>
    <table><caption className="visually-hidden">The six reporting domains and their scores</caption><tbody>
      {DEMO_SCAN.domains.map((domain) => <tr key={domain.id}>
        <th scope="row"><span className="roman">{domain.numeral}</span>{domain.title}</th><td>{domain.score}</td>
      </tr>)}
    </tbody></table>
    <p className="plate-caption">SPOKE LENGTH IS THE EVIDENCE THAT IT IS REPORTED</p>
  </section>;
}
export function MarginalNote({ result = DEMO_CHECKS.find((c) => c.id === 'cell_authentication')!, detail = false }: { result?: EnquiryResult; detail?: boolean }) {
  const passage = result.passage;
  const paragraph = passage && DEMO_SCAN.paragraphs.find((p) => p.id === passage.para);
  const quote = passage && paragraph ? paragraph.text.slice(passage.start, passage.end) : null;
  const question = result.id === 'cell_authentication' ? CELL_NOTE_QUESTION : result.check.question;
  return <article className={`marginal-note${detail ? ' marginal-note-detail' : ''}`} aria-labelledby={`note-${result.id}`}>
    <h2 id={`note-${result.id}`} className="section-title">{result.label.toUpperCase()}</h2>
    <p className="evidence-caption">Evidence {percent(result.evidence)}</p>
    <p className="enquiry-question">{question}</p>
    {quote ? <blockquote><p>{quote}</p></blockquote> : <p className="no-passage">No quoted passage is available in this demonstration.</p>}
    {passage ? <a className="folio-link" href={`/check/${result.id}#folio-${passage.page}`}>{passage.section} - Folio {passage.page} - Show on page</a> : <p className="folio-link">No folio reference in this demonstration.</p>}
  </article>;
}
export function WarningMark() {
  return <svg viewBox="0 0 24 24" className="warning-mark" aria-hidden="true"><path d="M12 2 23 22H1Z" fill="currentColor" /><path d="M12 8v6m0 3v1" stroke="#fff" strokeWidth="2" /></svg>;
}
