'use client';
import { useRouter } from 'next/navigation';
import { useScan } from './scan-provider';
import type { EnquiryResult } from '@/lib/scan-client';
import type { Domain } from '@/lib/catalogue.ts';
import { percent } from '@/lib/format';

const CENTRE = 400;
const HUB = 46;      // where every spoke starts
const REACH = 239;   // the length of a fully-evidenced spoke
const point = (angle: number, radius: number) => ({ x: CENTRE + Math.cos(angle) * radius, y: CENTRE + Math.sin(angle) * radius });
const angleOf = (index: number, count: number) => index * Math.PI * 2 / count - Math.PI / 2;

/** A sector arc for one domain, drawn at that domain's score. */
function arc(from: number, to: number, radius: number): string {
  const a = point(from, radius); const b = point(to, radius);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * The run of spokes belonging to each domain.
 *
 * The catalogue is published in domain order, so a domain owns a contiguous block of spokes and
 * therefore a contiguous wedge of the plate. That is what lets a domain's score be drawn across its
 * own wedge, turning the engraving into a reading of how far each category has come. Nothing is
 * sorted or regrouped here: if the catalogue order ever changed, the wedges would follow it.
 */
function sectors(checks: EnquiryResult[]) {
  const runs: { id: Domain; start: number; end: number }[] = [];
  checks.forEach((check, index) => {
    const id = check.check.domain;
    const last = runs[runs.length - 1];
    if (last && last.id === id) last.end = index;
    else runs.push({ id, start: index, end: index });
  });
  return runs;
}

export function RadialPlate({ compact = false, checks: provided }: { compact?: boolean; checks?: EnquiryResult[] }) {
  const { scan } = useScan();
  const router = useRouter();
  const checks = provided ?? scan?.checks;
  if (!checks || checks.length === 0) return null;
  const runs = sectors(checks);
  const half = Math.PI / checks.length;
  const scores = new Map((scan?.domains ?? []).map((domain) => [domain.id, domain.score]));

  return <svg className={`radial-plate${compact ? ' radial-plate-compact' : ''}`} viewBox="0 0 800 800" role="img"
              aria-label={`The engraved plate: ${checks.length} spokes, one for every enquiry. Spoke length is proportional to evidence. An arc across each domain's wedge shows that domain's score.`}>
    <title>The engraved plate</title>
    <desc>Each spoke corresponds to one catalogue enquiry. Longer spokes indicate stronger reporting evidence. An arc spans each domain's own wedge of enquiries, drawn at that domain's score, against a faint arc at full reach. Select a spoke to read its marginal note.</desc>
    <g className="engraved-rings" fill="none">
      {[40, 46, 105, 165, 225, 285, 297, 303].map((r) => <circle key={r} cx={CENTRE} cy={CENTRE} r={r} />)}
    </g>
    <g className="domain-wedges">
      {runs.map((run) => {
        const from = angleOf(run.start, checks.length) - half;
        const to = angleOf(run.end, checks.length) + half;
        const score = scores.get(run.id);
        const outer = point(from, HUB + REACH);
        const inner = point(from, HUB);
        return <g key={run.id}>
          <path className="wedge-divider" d={`M${inner.x.toFixed(2)} ${inner.y.toFixed(2)}L${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`} />
          {typeof score === 'number'
            ? <>
                <path className="category-track" d={arc(from, to, HUB + REACH)} />
                <path className="category-arc" d={arc(from, to, HUB + Math.max(2, REACH * (score / 100)))} />
              </>
            : null}
        </g>;
      })}
    </g>
    {Array.from({ length: checks.length * 2 }, (_, i) => {
      const angle = i * Math.PI * 2 / (checks.length * 2) - Math.PI / 2;
      const a = point(angle, 297); const b = point(angle, i % 2 === 0 ? 308 : 303);
      return <path key={i} className="plate-tick" d={`M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}`} />;
    })}
    {checks.map((check, i) => {
      const angle = angleOf(i, checks.length);
      const a = point(angle, HUB); const b = point(angle, HUB + REACH * check.evidence);
      const label = point(angle, 321 + (i % 2) * 16);
      const rotation = angle * 180 / Math.PI;
      const left = Math.cos(angle) < 0;
      return <a key={check.id} href={`/check/${check.id}`} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); router.push(`/check/${check.id}`); } }} aria-label={`${check.label}: ${['pending', 'unanswered', 'not-applicable'].includes(check.state) ? check.state.replaceAll('-', ' ') : percent(check.evidence)}`} className={`plate-enquiry${!check.applicable ? ' plate-not-applicable' : ''}`}>
        <title>{`${check.label}: ${['pending', 'unanswered', 'not-applicable'].includes(check.state) ? check.state.replaceAll('-', ' ') : percent(check.evidence)}${!check.applicable ? ' (does not apply)' : ''}`}</title>
        <line data-spoke={check.id} x1={a.x} y1={a.y} x2={b.x.toFixed(2)} y2={b.y.toFixed(2)} className="evidence-spoke" />
        <circle cx={b.x.toFixed(2)} cy={b.y.toFixed(2)} r="2.25" className="spoke-dot" />
        {!compact && <text x={label.x} y={label.y} textAnchor={left ? 'end' : 'start'} dominantBaseline="middle" transform={`rotate(${left ? rotation + 180 : rotation} ${label.x} ${label.y})`}>{check.id.replaceAll('_', ' ')}</text>}
      </a>;
    })}
    <circle className="plate-hub" cx={CENTRE} cy={CENTRE} r="12" fill="none" />
    <circle className="plate-hub" cx={CENTRE} cy={CENTRE} r="3" />
    <path className="plate-tick" d="M382 400h36M400 382v36" />
  </svg>;
}
