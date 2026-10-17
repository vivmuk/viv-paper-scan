"use client";
import { useState } from 'react';
import { CATALOGUE } from '@/lib/catalogue';
import { DISCLOSURE } from '@/lib/fixtures';
export function CopyCatalogue() {
  const [status, setStatus] = useState('');
  async function copy() {
    const json = JSON.stringify({ disclosure: DISCLOSURE, checks: CATALOGUE }, null, 2);
    try { await navigator.clipboard.writeText(json); setStatus('Catalogue copied: 74 enquiries.'); }
    catch { setStatus('Clipboard access was unavailable. Use the JSON download instead.'); }
  }
  return <div className="catalogue-actions"><button className="blue-button" type="button" onClick={() => void copy()}>Copy the catalogue as JSON</button>
    <p className="copy-status" role="status">{status}</p>
    {status.startsWith('Clipboard') && <a download="viv-paper-scan-catalogue.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ disclosure: DISCLOSURE, checks: CATALOGUE }, null, 2))}`}>Download the catalogue as JSON</a>}
  </div>;
}
