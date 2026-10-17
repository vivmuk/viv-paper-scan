'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useScan } from './scan-provider';
import { elapsedLabel, paceRemaining, readingSteps, remainingLabel, silentFor } from '@/lib/progress';

const MARK: Record<'read' | 'reading' | 'waiting', string> = { read: '\u2713', reading: '\u25B8', waiting: '\u00b7' };
const WORD: Record<'read' | 'reading' | 'waiting', string> = { read: 'read', reading: 'reading now', waiting: 'waiting' };
/** Past this, a pass is slow enough that saying nothing would look like a stall. */
const SILENCE_NOTICE = 90_000;

/**
 * What is happening while the paper is being read.
 *
 * The scan is seven passes and the client knows all seven before it starts, so this counts rather
 * than guesses: a step is called read only when its own pass has landed. The clock is the time
 * actually spent, and the estimate is measured from the pace of the passes already finished, so a
 * reader can see the number is derived rather than asserted. When a pass goes quiet for long enough
 * to be worth mentioning, that is said out loud instead of being left to look like a stall.
 */
export function ScanStatus() {
  const { session, scan, cancel, retry } = useScan();
  const [, tick] = useState(0);
  const scanning = session?.status === 'scanning';
  // One re-render a second, and only while there is something to count.
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => tick((count) => count + 1), 1000);
    return () => clearInterval(id);
  }, [scanning]);

  if (!scan) return <p className="no-passage">No paper is open. <Link href="/">Choose a PDF on the Docket</Link>. Results stay in this tab while you turn the pages; reloading clears them.</p>;
  if (scan.demonstration) return <p className="demo-notice">Demonstration data</p>;

  const steps = readingSteps(session, scan);
  const done = steps.filter((step) => step.state === 'read').length;
  const now = Date.now();
  // A finished reading must not keep counting up, so it stops at the last thing that arrived.
  const until = scanning ? now : session?.lastEventAt ?? now;
  const elapsed = session?.startedAt ? until - session.startedAt : 0;
  const estimate = scanning ? paceRemaining(session?.arrivals ?? [], steps.length - done, now) : 0;
  const silence = silentFor(session, now);
  const current = steps.find((step) => step.state === 'reading');
  const answered = scan.counters.good + scan.counters.unclear + scan.counters.bad;
  const counters = `${answered} enquiries answered, ${scan.unanswered} unanswered, ${scan.counters.notApplicable} do not apply${scan.pending ? `, ${scan.pending} pending` : ''}`;

  // Once the reading is done the instrument collapses to its result: the register below is where the
  // findings live, and seven rows saying "read" would only push it down the page.
  if (session?.status === 'complete') return <section className="reading">
    <h2 className="reading-title">THE READING</h2>
    <p className="reading-line">The paper was read in <strong>{elapsedLabel(elapsed)}</strong> across {steps.length} passes. {counters}.</p>
  </section>;

  return <section className="reading" aria-label="Scan progress">
    <h2 className="reading-title">THE READING</h2>
    <p className="reading-paper">{scan.paper.title}</p>
    <p className="reading-clock" role="status" aria-live="polite">
      {scanning
        ? <>Reading for <strong>{elapsedLabel(elapsed)}</strong>. {estimate === null
            ? `${done} of ${steps.length} passes finished, so there is no pace yet to judge the rest by.`
            : estimate === 0 ? 'The last pass is running.'
            : <>{remainingLabel(estimate)} <span className="reading-basis">(measured from the {done} passes finished, not a fixed guess)</span>.</>}</>
        : <>Stopped after <strong>{elapsedLabel(elapsed)}</strong>, at {done} of {steps.length} passes.</>}
    </p>
    {silence !== null && silence > SILENCE_NOTICE && current
      ? <p className="reading-silence">No word yet from the {current.title.toLowerCase()} pass; it has been running {elapsedLabel(silence)}. Passes vary, and some take several minutes.</p>
      : null}
    <table className="ruled-table reading-steps">
      <caption className="visually-hidden">The seven passes of the scan and what each has reached</caption>
      <tbody>
        {steps.map((step) => <tr key={step.key} className={`reading-step reading-step-${step.state}`}>
          <td className="reading-numeral" aria-hidden="true">{step.numeral === '\u2014' ? '\u00b7' : step.numeral}</td>
          <th scope="row">{step.title}</th>
          <td className="reading-state"><span className="reading-mark" aria-hidden="true">{MARK[step.state]}</span>{WORD[step.state]}</td>
          <td className="reading-detail">{step.detail ?? ''}</td>
        </tr>)}
      </tbody>
    </table>
    <p className="reading-counters">{counters}.</p>
    <p className="reading-privacy">Your file was read in this browser and never uploaded; only its paragraphs were sent. Nothing is stored.</p>
    {session?.notes.map((note, index) => <p className="reading-note" key={index}>{note}</p>)}
    {session?.error ? <p className="reading-error">{session.error}</p> : null}
    <div className="reading-actions">
      {scanning
        ? <button className="blue-button" type="button" onClick={cancel}>Stop the reading</button>
        : <button className="blue-button" type="button" onClick={retry}>Start the reading again</button>}
    </div>
  </section>;
}

export function SpecimenLink() {
  const { specimen } = useScan();
  return <Link className="specimen-link" href="/scan" onClick={specimen}>Open the specimen <span aria-hidden="true">↗</span></Link>;
}
