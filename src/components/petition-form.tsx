"use client";
import { useMemo, useState } from 'react';
import { useScan } from './scan-provider';
import { petitionItems, petitionBrief } from '@/lib/petition-client';

export function PetitionForm() {
  const { scan } = useScan();
  const [selected, setSelected] = useState<string[]>([]);
  const [includeTitle, setIncludeTitle] = useState(false);
  const [status, setStatus] = useState('');
  const items = scan ? petitionItems(scan) : [];
  const brief = useMemo(() => scan ? petitionBrief(scan, selected, includeTitle) : '', [scan, selected, includeTitle]);
  async function copyAndOpen() {
    try {
      await navigator.clipboard.writeText(brief);
      // Open only the application. Never put the paper or the brief in a URL.
      const tab = window.open('https://venice.ai', '_blank', 'noopener,noreferrer');
      if (tab) tab.opener = null;
      setStatus('Brief copied. Paste it into the window you opened. If the window was blocked, open your assistant and paste the brief.');
    } catch { setStatus('Copy was unavailable. Select the brief above and copy it manually.'); }
  }
  if (!scan) return null;
  return <div className="spread petition-spread">
    <section className="petition-list" aria-label="Particulars to petition for">
      <table><caption className="visually-hidden">Select the gaps to include in your brief</caption><tbody>
        {items.map((item) => <tr key={item.id}>
          <td className="petition-checkbox"><input type="checkbox" name="particular" value={item.id} id={`petition-${item.id}`} checked={selected.includes(item.id)} onChange={(event) => {
            setSelected((previous) => event.target.checked ? [...previous, item.id] : previous.filter((id) => id !== item.id)); setStatus('');
          }} /></td>
          <th scope="row"><label htmlFor={`petition-${item.id}`}><strong>{item.title}</strong><em>{item.action}</em></label></th>
          <td className="petition-count">{item.count}</td>
        </tr>)}
      </tbody></table>
    </section>
    <aside className="margin-column petition-margin"><div className="brief-box">
      <label htmlFor="petition-brief" className="section-title">BRIEF</label>
      <textarea id="petition-brief" name="brief" autoComplete="off" readOnly value={brief} spellCheck={false} />
      <label className="include-title"><input type="checkbox" name="include-title" checked={includeTitle} onChange={(event) => setIncludeTitle(event.target.checked)} />Include title and DOI</label>
      <button className="blue-button" type="button" disabled={!items.some(item => selected.includes(item.id))} onClick={() => void copyAndOpen()}>Copy and open</button>
      <p className="petition-privacy"><span className="desktop-copy">Your paper is not sent. Only the gaps you ticked leave this page.</span><span className="phone-copy">Your paper is not sent. Only the gaps you ticked.</span></p>
      <p role="status" className="copy-status">{status}</p>
    </div></aside>
  </div>;
}
