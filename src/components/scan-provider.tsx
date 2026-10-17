'use client';
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { DEMO_SCAN } from '@/lib/fixtures';
import { applyScanEvent, createSession, presentScan, readScanStream, type PaperParagraph, type ScanPresentation, type ScanSession, type WireEvent } from '@/lib/scan-client';

interface ScanContextValue {
  session: ScanSession | null;
  scan: ScanPresentation | null;
  start: (paper: ScanSession['paper'], paragraphs: PaperParagraph[]) => void;
  specimen: () => void;
  cancel: () => void;
  retry: () => void;
}
const ScanContext = createContext<ScanContextValue | null>(null);
/**
 * Arrival times are the only evidence of a scan's pace, and they are records of what happened
 * rather than of what was found: they change no verdict, and nothing on the wire carries them.
 */
function withTiming(session: ScanSession, event: WireEvent): ScanSession {
  const next = applyScanEvent(session, event);
  const at = Date.now();
  return { ...next, startedAt: session.startedAt, lastEventAt: at,
    arrivals: event.type === 'domain' ? [...(session.arrivals ?? []), at] : session.arrivals };
}
/** Memory only: survives App Router navigation, but never stores the paper on disk. */
export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [demo, setDemo] = useState(false);
  const controller = useRef<AbortController | null>(null);
  function start(paper: ScanSession['paper'], paragraphs: PaperParagraph[]) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setDemo(false);
    const began = Date.now();
    setSession({ ...createSession(paper, paragraphs), startedAt: began, arrivals: [], lastEventAt: began });
    void (async () => {
      try {
        const response = await fetch('/api/scan', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          // No File, bytes, page objects or metadata cross this boundary.
          body: JSON.stringify({ paragraphs: paragraphs.map(({ id, section, text }) => ({ id, section, text })) }),
          signal: request.signal,
        });
        await readScanStream(response, event => {
          if (controller.current === request) setSession(previous => previous ? withTiming(previous, event) : previous);
        }, request.signal);
      } catch (error) {
        if (controller.current !== request) return;
        setSession(previous => previous ? { ...previous,
          status: request.signal.aborted ? 'cancelled' : 'error',
          lastEventAt: Date.now(),
          error: request.signal.aborted ? 'The scan was cancelled. Partial results are shown.' : error instanceof Error ? error.message : 'The scan could not be completed.' } : previous);
      }
    })();
  }
  function specimen() { controller.current?.abort(); controller.current = null; setSession(null); setDemo(true); }
  const scan = useMemo(() => demo ? { ...DEMO_SCAN, pending: 0, unanswered: 0 } as ScanPresentation : session ? presentScan(session) : null, [demo, session]);
  return <ScanContext.Provider value={{ session, scan, start, specimen,
    cancel: () => controller.current?.abort(), retry: () => { if (session) start(session.paper, session.paragraphs); } }}>{children}</ScanContext.Provider>;
}
export function useScan() {
  const value = useContext(ScanContext);
  if (!value) throw new Error('Scan components require ScanProvider.');
  return value;
}
