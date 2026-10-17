'use client';
import { useEffect, useMemo, useState } from 'react';
import { Masthead } from './almanac';
import { ScanStatus } from './scan-status';
import { useScan } from './scan-provider';
import { INSTRUMENTS } from '@/lib/fixtures';
import { runInstruments } from '@/lib/instruments';
import { extractDois } from '@/lib/pdf-text';
import type { DoiRecord } from '@/lib/crossref';
interface Lookup { checkedAt: string; crossref: Record<string, DoiRecord> }
const cache = new Map<string, Lookup>();
export function AnnexView() {
  const { scan } = useScan();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const readings = useMemo(() => runInstruments(scan?.demonstration ? [] : scan?.paragraphs ?? []), [scan?.paragraphs, scan?.demonstration]);
  const doiKey = useMemo(() => JSON.stringify(extractDois(scan?.demonstration ? '' : scan?.paragraphs.map(p => p.text).join('\n') ?? '')), [scan?.paragraphs, scan?.demonstration]);
  useEffect(() => {
    setLookup(null); setError('');
    const dois = JSON.parse(doiKey) as string[];
    if (!dois.length) return;
    const saved = cache.get(doiKey);
    if (saved && attempt === 0) { setLookup(saved); return; }
    const request = new AbortController();
    void fetch('/api/lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dois }), signal: request.signal })
      .then(async response => { if (!response.ok) throw new Error(`Public-register request failed (${response.status}).`); return response.json() as Promise<Lookup>; })
      .then(result => { if (!request.signal.aborted) { cache.set(doiKey, result); setLookup(result); } })
      .catch(err => { if (!request.signal.aborted) setError(err instanceof Error ? err.message : 'The public register could not be reached.'); });
    return () => request.abort();
  }, [doiKey, attempt]);
  const summarise = (results: { result: { status: string } }[], failures: number) => !results.length ? 'nothing to redo — no supported report parsed' : `${results.length} checked; ${failures} mismatch${failures === 1 ? '' : 'es'}; ${results.filter(r => r.result.status === 'invalid').length} invalid`;
  const records = lookup ? Object.entries(lookup.crossref) : [];
  const notices = records.flatMap(([, record]) => record.updates ?? []);
  const registerErrors = records.filter(([, record]) => record.error).length;
  const resolved = records.filter(([, record]) => record.found).length;
  const states = [
    summarise(readings.statistics, readings.statistics.filter(r => r.result.consistent === false).length),
    summarise(readings.intervals, readings.intervals.filter(r => r.result.valid === false).length),
    summarise(readings.percentages, readings.percentages.filter(r => r.result.matches === false).length),
    summarise(readings.grim, readings.grim.filter(r => r.result.possible === false).length),
    error || (lookup ? `${notices.length} Crossref notices from ${resolved} resolved DOIs; ${registerErrors} lookup errors; Retraction Watch not checked` : doiKey === '[]' ? 'no DOI found — not checked' : 'checking Crossref…'),
    'not checked — Cellosaurus matching is not implemented',
    error || (lookup ? `${resolved} of ${records.length} DOIs resolve; ${registerErrors} lookup errors; repository access and accessions not checked` : doiKey === '[]' ? 'no DOI found — not checked' : 'checking DOIs…'),
  ];
  const findings = [...readings.statistics, ...readings.intervals, ...readings.percentages, ...readings.grim];
  return <div className="document-page annex-page"><ScanStatus /><Masthead>THE INSTRUMENTS ANNEX</Masthead>
    <p className="document-intro">Settled by arithmetic and public registers, not by judgement.</p>
    {scan && <><table className="ruled-table annex-table"><caption className="visually-hidden">Checks settled by arithmetic and public registers</caption>
      <colgroup><col className="number-col" /><col /><col className="state-col" /></colgroup>
      <thead><tr><th scope="col">No.</th><th scope="col">Check</th><th scope="col">State</th></tr></thead>
      <tbody>{INSTRUMENTS.map((row, i) => <tr key={row.numeral}>
        <td className="roman">{row.numeral}</td><th scope="row"><h2>{row.title}</h2><p>{row.method}</p></th><td className="instrument-state">{scan.demonstration ? row.state : states[i]}</td>
      </tr>)}</tbody>
    </table>
    {!scan.demonstration && <><p className="input-status">Only explicit supported number formats are recomputed. No result means no supported report was parsed, not that the paper is consistent. One-sided or adjusted p-values need manual review; GRIM requires explicitly whole-number measurements.</p>
    {(error || registerErrors > 0) && <button className="blue-button" type="button" onClick={() => setAttempt(n => n + 1)}>Retry public registers</button>}
    {!!findings.length && <table className="ruled-table"><caption>Arithmetic readings</caption><thead><tr><th>Paragraph</th><th>Reported</th><th>Recomputed</th></tr></thead><tbody>{findings.map((finding, i) => <tr key={i}><td>{finding.para}</td><td>{finding.quote}</td><td>{finding.result.message}</td></tr>)}</tbody></table>}
    {lookup && <table className="ruled-table"><caption>Crossref — checked {lookup.checkedAt}</caption><thead><tr><th>DOI</th><th>Register response</th></tr></thead><tbody>{records.map(([doi, record]) => <tr key={doi}><th scope="row">{doi}</th><td>{record.error ? `Not checked: ${record.error}` : record.found ? `Found${record.title ? `: ${record.title}` : ''}${record.year ? ` (${record.year})` : ''}` : 'Not found'}{record.updates?.map((update, i) => <p key={i}>{update.type}: {update.doi}{update.date ? ` — ${update.date}` : ''}</p>)}</td></tr>)}</tbody></table>}</>}
    </>}
  </div>;
}
