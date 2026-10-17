"use client";
import { useRef, useState, type DragEvent } from 'react';

export function DropSlot() {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function select(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setMessage('Choose a PDF file.'); return; }
    if (file.size > 50 * 1024 * 1024) { setMessage('Choose a PDF smaller than 50 MB.'); return; }
    setBusy(true);
    try {
      const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (signature !== '%PDF-') { setMessage('This file is not a readable PDF. Choose another file.'); return; }
      setMessage(`${file.name} selected. Live scanning is not connected in this demonstration. Open the specimen to explore the worked example.`);
    } catch { setMessage('The PDF could not be read. Choose another file.'); }
    finally { setBusy(false); }
  }
  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setDragging(false); void select(event.dataTransfer.files[0]);
  }
  return <div className="ingest-control">
    <label className={`drop-slot${dragging ? ' is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <svg className="drop-arrow" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2v29M6 22l10 10 10-10M3 38h26" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      <span>Drop a PDF or <span className="choose-file">choose a file</span></span>
      <input ref={input} type="file" name="paper" autoComplete="off" accept="application/pdf,.pdf" aria-label="Drop a PDF or choose a file" onChange={(event) => void select(event.target.files?.[0])} disabled={busy} />
    </label>
    <p className="input-status" role="status">{busy ? 'Reading the PDF in your browser…' : message}</p>
  </div>;
}
