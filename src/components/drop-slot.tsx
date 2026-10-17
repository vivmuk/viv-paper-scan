"use client";
import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useScan } from './scan-provider';
import { classifyManuscript, rejectionMessage } from '@/lib/accept';

export function DropSlot() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { start } = useScan();
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function select(file?: File) {
    if (!file || busy) return;
    const kind = classifyManuscript(file.name);
    const refused = rejectionMessage(kind);
    if (refused) { setMessage(refused); return; }
    if (file.size > 50 * 1024 * 1024) { setMessage('Choose a file smaller than 50 MB.'); return; }
    setBusy(true);
    setMessage('Reading the file in your browser…');
    try {
      if (kind === 'pdf') {
        const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
        if (signature !== '%PDF-') { setMessage('This file is not a readable PDF. Choose another file.'); return; }
      }
      const { extractPdf } = await import('@/lib/pdf-browser');
      const { extractTextManuscript } = await import('@/lib/docx-browser');
      const extracted = kind === 'pdf'
        ? await extractPdf(file, setMessage)
        : await extractTextManuscript(file, kind as 'docx' | 'text', setMessage);
      start(extracted.paper, extracted.paragraphs);
      router.push('/scan');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The file could not be read. Choose another file.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setDragging(false); void select(event.dataTransfer.files[0]);
  }
  return <div className="ingest-control">
    <label className={`drop-slot${dragging ? ' is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <svg className="drop-arrow" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2v29M6 22l10 10 10-10M3 38h26" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      <span>Drop a PDF, DOCX, TXT or MD, or <span className="choose-file">choose a file</span></span>
      <input ref={input} type="file" name="paper" autoComplete="off" accept=".pdf,.docx,.txt,.md,application/pdf" aria-label="Drop a PDF, DOCX, TXT or MD, or choose a file" onChange={(event) => void select(event.target.files?.[0])} disabled={busy} />
    </label>
    <p className="input-status" role="status">{message || 'Your file is read in this browser and never uploaded; only the extracted paragraphs are sent for scanning. Legacy Word .doc files are not accepted — save as .docx or PDF.'}</p>
  </div>;
}