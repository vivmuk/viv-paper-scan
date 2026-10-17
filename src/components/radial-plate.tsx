'use client';
import { useRouter } from 'next/navigation';
import { useScan } from './scan-provider';
import type { EnquiryResult } from '@/lib/scan-client';
import { percent } from '@/lib/format';

const point = (angle: number, radius: number) => ({ x: 400 + Math.cos(angle) * radius, y: 400 + Math.sin(angle) * radius });
export function RadialPlate({ compact = false, checks: provided }: { compact?: boolean; checks?: EnquiryResult[] }) {
  const { scan } = useScan();
  const router = useRouter();
  const checks = provided ?? scan?.checks;
  if (!checks) return null;
  return <svg className={`radial-plate${compact ? ' radial-plate-compact' : ''}`} viewBox="0 0 800 800" role="img" aria-label={`The engraved plate: ${checks.length} spokes, one for every enquiry. Spoke length is proportional to evidence.`}>
    <title>The engraved plate</title>
    <desc>Each spoke corresponds to one catalogue enquiry. Longer spokes indicate stronger reporting evidence. Select a spoke to read its marginal note.</desc>
    <g className="engraved-rings" fill="none">
      {[40, 46, 105, 165, 225, 285, 297, 303].map((r) => <circle key={r} cx="400" cy="400" r={r} />)}
    </g>
    {Array.from({ length: checks.length * 2 }, (_, i) => {
      const angle = i * Math.PI * 2 / (checks.length * 2) - Math.PI / 2;
      const a = point(angle, 297); const b = point(angle, i % 2 === 0 ? 308 : 303);
      return <path key={i} className="plate-tick" d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />;
    })}
    {checks.map((check, i) => {
      const angle = i * Math.PI * 2 / checks.length - Math.PI / 2;
      const a = point(angle, 46); const b = point(angle, 46 + 239 * check.evidence);
      const label = point(angle, 321 + (i % 2) * 16);
      const rotation = angle * 180 / Math.PI;
      const left = Math.cos(angle) < 0;
      return <a key={check.id} href={`/check/${check.id}`} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); router.push(`/check/${check.id}`); } }} aria-label={`${check.label}: ${['pending', 'unanswered', 'not-applicable'].includes(check.state) ? check.state.replaceAll('-', ' ') : percent(check.evidence)}`} className={`plate-enquiry${!check.applicable ? ' plate-not-applicable' : ''}`}>
        <title>{`${check.label}: ${['pending', 'unanswered', 'not-applicable'].includes(check.state) ? check.state.replaceAll('-', ' ') : percent(check.evidence)}${!check.applicable ? ' (does not apply)' : ''}`}</title>
        <line data-spoke={check.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="evidence-spoke" />
        <circle cx={b.x} cy={b.y} r="2.25" className="spoke-dot" />
        {!compact && <text x={label.x} y={label.y} textAnchor={left ? 'end' : 'start'} dominantBaseline="middle" transform={`rotate(${left ? rotation + 180 : rotation} ${label.x} ${label.y})`}>{check.id.replaceAll('_', ' ')}</text>}
      </a>;
    })}
    <circle className="plate-hub" cx="400" cy="400" r="12" fill="none" />
    <circle className="plate-hub" cx="400" cy="400" r="3" />
    <path className="plate-tick" d="M382 400h36M400 382v36" />
  </svg>;
}
