import { recomputeStatistic, estimateInInterval, percentages, grim, type ParsedStatistic, type PRelation } from './arithmetic.ts';
import type { PaperParagraph } from './scan-client.ts';
const N = '[-+]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const decimals = (s: string) => s.split('.')[1]?.length ?? 0;
export function runInstruments(paragraphs: PaperParagraph[]) {
  const statistics: { para: string; quote: string; result: ReturnType<typeof recomputeStatistic> }[] = [];
  const intervals: { para: string; quote: string; result: ReturnType<typeof estimateInInterval> }[] = [];
  const perCents: { para: string; quote: string; result: ReturnType<typeof percentages> }[] = [];
  const means: { para: string; quote: string; result: ReturnType<typeof grim> }[] = [];
  for (const para of paragraphs) {
    const text = para.text.replaceAll('−', '-');
    // Only tightly paired conventional reports are parsed; no inferred df, n, or sidedness.
    const stats = new RegExp(`\\b(t|F|z|r|chi-square|χ²)\\s*(?:\\(\\s*(${N})(?:\\s*,\\s*(${N}))?\\s*\\))?\\s*=\\s*(${N})\\s*[,;]\\s*p\\s*(<=|>=|<|>|=|≤|≥)\\s*(${N})`, 'gi');
    for (const m of text.matchAll(stats)) {
      let statistic: ParsedStatistic;
      const value = Number(m[4]);
      const kind = m[1].toLowerCase();
      if (kind === 't' && m[2]) statistic = { type: 't', value, df: Number(m[2]) };
      else if (kind === 'f' && m[2] && m[3]) statistic = { type: 'F', value, numeratorDf: Number(m[2]), denominatorDf: Number(m[3]) };
      else if ((kind === 'chi-square' || kind === 'χ²') && m[2]) statistic = { type: 'chi-square', value, df: Number(m[2]) };
      else if (kind === 'z') statistic = { type: 'z', value };
      else continue; // r(df) is not n; never silently convert it.
      const relation = m[5].replace('≤', '<=').replace('≥', '>=') as PRelation;
      statistics.push({ para: para.id, quote: m[0], result: recomputeStatistic({ ...statistic, reportedP: Number(m[6]), pDecimals: decimals(m[6]), relation }) });
    }
    const pearson = new RegExp(`Pearson(?:'s)?\\s+r\\s*=\\s*(${N})\\s*[,;]\\s*n\\s*=\\s*(\\d+)\\s*[,;]\\s*p\\s*(<=|>=|<|>|=)\\s*(${N})`, 'gi');
    for (const m of text.matchAll(pearson)) statistics.push({ para: para.id, quote: m[0], result: recomputeStatistic({ type: 'r', value: Number(m[1]), n: Number(m[2]), reportedP: Number(m[4]), pDecimals: decimals(m[4]), relation: m[3] }) });
    const percent = new RegExp(`\\b(\\d+)\\s*(?:of|/)\\s*(\\d+)\\s*\\(\\s*(${N})\\s*%\\s*\\)`, 'gi');
    for (const m of text.matchAll(percent)) perCents.push({ para: para.id, quote: m[0], result: percentages(Number(m[1]), Number(m[2]), Number(m[3]), decimals(m[3])) });
    const interval = new RegExp(`\\b(?:OR|RR|HR|estimate|mean)\\s*=\\s*(${N})\\s*[,;]\\s*(?:\\d+%\\s*)?(?:CI|confidence interval)\\s*[:=]?\\s*\\[\\s*(${N})\\s*[,;]\\s*(${N})\\s*\\]`, 'gi');
    for (const m of text.matchAll(interval)) intervals.push({ para: para.id, quote: m[0], result: estimateInInterval(Number(m[1]), Number(m[2]), Number(m[3])) });
    const whole = new RegExp(`\\b(?:integer|whole-number)(?:-valued)?\\s+mean\\s*=\\s*(${N})\\s*[,;]\\s*n\\s*=\\s*(\\d+)`, 'gi');
    for (const m of text.matchAll(whole)) means.push({ para: para.id, quote: m[0], result: grim(Number(m[1]), Number(m[2]), decimals(m[1])) });
  }
  return { statistics, intervals, percentages: perCents, grim: means };
}
