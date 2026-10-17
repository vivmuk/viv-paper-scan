/**
 * Deterministic reporting checks, not a judgement of scientific validity.
 * Inputs are parsed numbers: this module neither extracts paper text nor infers
 * whether data are integer-valued, tests are adjusted, or a test is one-sided.
 * Distribution results use IEEE-754 doubles; tails below Number.MIN_VALUE
 * underflow to zero. Non-convergence returns invalid, never an invented p.
 */

export type ArithmeticStatus = 'ok' | 'invalid';

/** p is two-sided for symmetric t/r/z tests; chi-square and F use their upper tail. */
export interface PValueResult {
  status: ArithmeticStatus;
  p: number | null;
  tail: 'two-sided' | 'upper';
  message: string;
}

const EPSILON = 3e-14;
const TINY = 1e-300;
const MAX_ITERATIONS = 10000;

/** Lanczos log-gamma, g=7, coefficients from Numerical Recipes (3rd ed., ch. 6). */
function logGamma(z: number): number {
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let sum = coefficients[0];
  for (let i = 1; i < coefficients.length; i++) sum += coefficients[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

function nonzero(x: number): number {
  return Math.abs(x) < TINY ? (x < 0 ? -TINY : TINY) : x;
}

/** Incomplete beta continued fraction: modified Lentz method, Numerical Recipes §6.4. */
function betaFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 / nonzero(1 - qab * x / qap);
  let h = d;
  for (let m = 1; m <= MAX_ITERATIONS; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 / nonzero(1 + aa * d);
    c = nonzero(1 + aa / c);
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 / nonzero(1 + aa * d);
    c = nonzero(1 + aa / c);
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) <= EPSILON) return h;
  }
  return NaN; // Never convert non-convergence into a numeric finding.
}

/** Regularized I_x(a,b), switching tails to avoid cancellation in the fraction. */
function betaI(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b)
    + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2)
    ? factor * betaFraction(a, b, x) / a
    : 1 - factor * betaFraction(b, a, 1 - x) / b;
}

function pResult(p: number, tail: PValueResult['tail']): PValueResult {
  if (!Number.isFinite(p) || p < -1e-12 || p > 1 + 1e-12) {
    return invalidP('numerical evaluation did not converge within supported precision', tail);
  }
  const bounded = Math.min(1, Math.max(0, p));
  return { status: 'ok', p: bounded, tail, message: `recomputed ${tail} p = ${bounded}` };
}

function invalidP(message: string, tail: PValueResult['tail']): PValueResult {
  return { status: 'invalid', p: null, tail, message };
}

/** A finite numerical range is explicit; fractional degrees of freedom are allowed. */
function validDf(df: number): boolean {
  return Number.isFinite(df) && df > 0 && df <= 1e7;
}

/** log(1/(1+exp(logRatio))) without overflow of a squared statistic or df*F. */
function logReciprocalOnePlus(logRatio: number): number {
  return logRatio > 0 ? -logRatio - Math.log1p(Math.exp(-logRatio)) : -Math.log1p(Math.exp(logRatio));
}

function betaFromLogX(logX: number, a: number, b: number): number {
  // Keep small x in log form: x may underflow while I_x does not.
  const x = Math.exp(logX);
  if (logX < -36) {
    const logFactor = a * logX + b * Math.log1p(-x)
      + logGamma(a + b) - logGamma(a) - logGamma(b) - Math.log(a);
    return Math.exp(logFactor) * betaFraction(a, b, x);
  }
  return betaI(x, a, b);
}

export function tPValue(t: number, df: number): PValueResult {
  if (!Number.isFinite(t) || !validDf(df)) return invalidP('t must be finite and df in (0, 10000000]', 'two-sided');
  const logX = logReciprocalOnePlus(2 * Math.log(Math.abs(t)) - Math.log(df));
  return pResult(betaFromLogX(logX, df / 2, 0.5), 'two-sided');
}

/**
 * Regularized upper incomplete gamma Q(a,x), Numerical Recipes §6.2:
 * use the convergent lower-gamma series for x < a+1 and the modified-Lentz
 * continued fraction otherwise. Evaluate the upper tail directly when small.
 */
function gammaQ(a: number, x: number): number {
  if (x === 0) return 1;
  if (x === Infinity) return 0;
  const factor = Math.exp(a * Math.log(x) - x - logGamma(a));
  if (x < a + 1) {
    let term = 1 / a;
    let sum = term;
    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      term *= x / (a + i);
      sum += term;
      if (Math.abs(term) <= Math.abs(sum) * EPSILON) return 1 - factor * sum;
    }
  } else {
    let b = x + 1 - a;
    let c = 1 / TINY;
    let d = 1 / nonzero(b);
    let h = d;
    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      const an = -i * (i - a);
      b += 2;
      d = 1 / nonzero(an * d + b);
      c = nonzero(b + an / c);
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) <= EPSILON) return factor * h;
    }
  }
  return NaN;
}

export interface DistributionResult {
  status: ArithmeticStatus;
  value: number | null;
  message: string;
}

/** Phi(z) = 1 - Q(1/2,z²/2)/2 for z >= 0; symmetry handles z < 0. */
export function normalCdf(z: number): DistributionResult {
  if (!Number.isFinite(z)) return { status: 'invalid', value: null, message: 'z must be finite' };
  const q = gammaQ(0.5, z * z / 2);
  const result = pResult(z < 0 ? q / 2 : 1 - q / 2, 'two-sided');
  return { status: result.status, value: result.p, message: result.status === 'ok' ? `normal CDF = ${result.p}` : result.message };
}

export function zPValue(z: number): PValueResult {
  if (!Number.isFinite(z)) return invalidP('z must be finite', 'two-sided');
  // Use the same gamma representation as Phi, without subtracting from 1.
  return pResult(gammaQ(0.5, z * z / 2), 'two-sided');
}

export function chiSquarePValue(statistic: number, df: number): PValueResult {
  if (!Number.isFinite(statistic) || statistic < 0 || !validDf(df)) {
    return invalidP('chi-square must be finite and nonnegative, with df in (0, 10000000]', 'upper');
  }
  return pResult(gammaQ(df / 2, statistic / 2), 'upper');
}

/** F uses the upper tail, not a doubled or equal-tail F test. */
export function fPValue(f: number, numeratorDf: number, denominatorDf: number): PValueResult {
  if (!Number.isFinite(f) || f < 0 || !validDf(numeratorDf) || !validDf(denominatorDf)) {
    return invalidP('F must be finite and nonnegative, with both dfs in (0, 10000000]', 'upper');
  }
  const logX = logReciprocalOnePlus(Math.log(numeratorDf) - Math.log(denominatorDf) + Math.log(f));
  return pResult(betaFromLogX(logX, denominatorDf / 2, numeratorDf / 2), 'upper');
}

/** Pearson correlation under the ordinary zero-correlation t test (not Spearman or partial r). */
export function rPValue(r: number, n: number): PValueResult {
  if (n < 0) throw new RangeError('sample size must not be negative');
  if (!Number.isFinite(r) || Math.abs(r) > 1 || !Number.isSafeInteger(n) || n <= 2 || !validDf(n - 2)) {
    return invalidP('Pearson r must be in [-1, 1], with integer n > 2 and n-2 <= 10000000', 'two-sided');
  }
  if (Math.abs(r) === 1) return pResult(0, 'two-sided');
  return pResult(betaI((1 - r) * (1 + r), (n - 2) / 2, 0.5), 'two-sided');
}

export type PRelation = '=' | '<' | '<=' | '>' | '>=';

export interface PComparisonResult {
  status: ArithmeticStatus;
  recomputedP: number | null;
  agreesAtPrecision: boolean | null;
  consistent: boolean | null;
  /** Separate from agreement: rounding can agree even when the .05 decision changes. */
  crossesSignificance: boolean | null;
  recomputedSignificant: boolean | null;
  reportedSignificant: boolean | null;
  message: string;
}

/**
 * Statcheck-style comparison (Nuijten et al., 2016). Equality means agreement
 * after rounding; inequalities are literal bounds. Significance is p < .05,
 * so p=.05 is not significant. Broad bounds can leave that decision unknown.
 * Only the supplied statistic is recomputed: rounded test-statistic uncertainty,
 * multiplicity corrections and one-sided alternatives are NOT inferred.
 */
export function comparePValue(recomputedP: number | null, reportedP: number, decimals: number, relation: PRelation = '='): PComparisonResult {
  const invalid = (message: string): PComparisonResult => ({
    status: 'invalid', recomputedP, agreesAtPrecision: null, consistent: null,
    crossesSignificance: null, recomputedSignificant: null, reportedSignificant: null, message,
  });
  if (recomputedP === null || !Number.isFinite(recomputedP) || recomputedP < 0 || recomputedP > 1) {
    return invalid('recomputed p must be finite and in [0, 1]');
  }
  const units = reportedUnits(reportedP, decimals);
  if (units === null || reportedP < 0 || reportedP > 1 || !['=', '<', '<=', '>', '>='].includes(relation)) {
    return invalid('reported p must be in [0, 1], at the reported precision, with a supported relation');
  }
  if ((relation === '<' && reportedP === 0) || (relation === '>' && reportedP === 1)) {
    return invalid('reported p bound has no possible probability');
  }
  const agreesAtPrecision = relation === '=' ? roundedNumberUnits(recomputedP, decimals) === units : null;
  let consistent: boolean;
  let reportedSignificant: boolean | null;
  switch (relation) {
    case '<':
      consistent = recomputedP < reportedP;
      reportedSignificant = reportedP <= 0.05 ? true : null;
      break;
    case '<=':
      consistent = recomputedP <= reportedP;
      reportedSignificant = reportedP < 0.05 ? true : null;
      break;
    case '>':
      consistent = recomputedP > reportedP;
      reportedSignificant = reportedP >= 0.05 ? false : null;
      break;
    case '>=':
      consistent = recomputedP >= reportedP;
      reportedSignificant = reportedP >= 0.05 ? false : null;
      break;
    default:
      consistent = agreesAtPrecision === true;
      reportedSignificant = reportedP < 0.05;
  }
  const recomputedSignificant = recomputedP < 0.05;
  const crossesSignificance = reportedSignificant === null ? null : reportedSignificant !== recomputedSignificant;
  return {
    status: 'ok', recomputedP, agreesAtPrecision, consistent,
    crossesSignificance, recomputedSignificant, reportedSignificant,
    message: `${crossesSignificance ? 'SIGNIFICANCE CROSSING at 0.05; ' : ''}recomputed p = ${recomputedP}; ${consistent ? 'consistent' : 'inconsistent'} with reported p ${relation} ${reportedP.toFixed(decimals)}${reportedSignificant === null ? '; reported bound does not determine significance at 0.05' : ''}`,
  };
}

export interface ReportedP {
  reportedP?: number;
  pDecimals?: number;
  relation?: PRelation;
}

export type ParsedStatistic = ReportedP & (
  | { type: 't'; value: number; df: number }
  | { type: 'F'; value: number; numeratorDf: number; denominatorDf: number }
  | { type: 'chi-square'; value: number; df: number }
  | { type: 'r'; value: number; n: number }
  | { type: 'z'; value: number }
);

export interface StatisticResult extends PComparisonResult {
  tail: PValueResult['tail'] | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Loop-friendly parser boundary. The exported ParsedStatistic type documents
 * the supported shape; unknown input is validated rather than trusted or thrown.
 */
export function recomputeStatistic(statistic: unknown): StatisticResult {
  const invalid = (message: string): StatisticResult => ({
    status: 'invalid', recomputedP: null, agreesAtPrecision: null, consistent: null,
    crossesSignificance: null, recomputedSignificant: null, reportedSignificant: null,
    tail: null, message,
  });
  if (!isRecord(statistic) || typeof statistic.value !== 'number') return invalid('parsed statistic must contain a numeric value');
  let result: PValueResult;
  switch (statistic.type) {
    case 't':
      if (typeof statistic.df !== 'number') return invalid('t requires numeric df');
      result = tPValue(statistic.value, statistic.df);
      break;
    case 'F':
      if (typeof statistic.numeratorDf !== 'number' || typeof statistic.denominatorDf !== 'number') {
        return invalid('F requires numeric numeratorDf and denominatorDf');
      }
      result = fPValue(statistic.value, statistic.numeratorDf, statistic.denominatorDf);
      break;
    case 'chi-square':
      if (typeof statistic.df !== 'number') return invalid('chi-square requires numeric df');
      result = chiSquarePValue(statistic.value, statistic.df);
      break;
    case 'r':
      if (typeof statistic.n !== 'number') return invalid('r requires numeric n');
      result = rPValue(statistic.value, statistic.n);
      break;
    case 'z':
      result = zPValue(statistic.value);
      break;
    default:
      return invalid('unsupported statistic type; expected t, F, chi-square, r or z');
  }
  if (result.status === 'invalid') return { ...invalid(result.message), tail: result.tail };
  if (statistic.reportedP === undefined && statistic.pDecimals === undefined && statistic.relation === undefined) {
    return {
      status: 'ok', recomputedP: result.p, tail: result.tail,
      agreesAtPrecision: null, consistent: null, crossesSignificance: null,
      recomputedSignificant: result.p === null ? null : result.p < 0.05,
      reportedSignificant: null, message: `${result.message}; no reported p supplied for comparison`,
    };
  }
  if (typeof statistic.reportedP !== 'number' || typeof statistic.pDecimals !== 'number') {
    return invalid('p comparison requires both reportedP and pDecimals');
  }
  const relation = statistic.relation ?? '=';
  if (relation !== '=' && relation !== '<' && relation !== '<=' && relation !== '>' && relation !== '>=') {
    return invalid('unsupported reported p relation');
  }
  return { ...comparePValue(result.p, statistic.reportedP, statistic.pDecimals, relation), tail: result.tail };
}

export interface IntervalResult {
  status: ArithmeticStatus;
  valid: boolean | null;
  inverted: boolean | null;
  containsEstimate: boolean | null;
  failures: ('interval-inverted' | 'estimate-outside')[];
  message: string;
}

/** Altman & Bland (2011): necessary arithmetic conditions, not CI coverage validation. */
export function estimateInInterval(estimate: number, low: number, high: number): IntervalResult {
  if (![estimate, low, high].every(Number.isFinite)) {
    return { status: 'invalid', valid: null, inverted: null, containsEstimate: null,
      failures: [], message: 'estimate and interval endpoints must be finite' };
  }
  const inverted = low > high;
  const containsEstimate = low <= estimate && estimate <= high;
  const failures: IntervalResult['failures'] = [];
  if (inverted) failures.push('interval-inverted');
  if (!containsEstimate) failures.push('estimate-outside');
  return {
    status: 'ok', valid: failures.length === 0, inverted, containsEstimate, failures,
    message: [inverted ? 'interval is inverted (low > high)' : '',
      !containsEstimate ? 'estimate is outside its reported interval' : ''].filter(Boolean).join('; ')
      || 'estimate is inside its non-inverted interval',
  };
}

export interface PercentageResult {
  status: ArithmeticStatus;
  matches: boolean | null;
  actualPercentage: number | null;
  roundedPercentage: number | null;
  message: string;
}

/** Counts must describe a subset, not weighted measurements or multiple responses. */
export function percentages(numerator: number, denominator: number, reported: number, decimals: number): PercentageResult {
  const invalid = (message: string): PercentageResult => ({
    status: 'invalid', matches: null, actualPercentage: null, roundedPercentage: null, message,
  });
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)
      || numerator < 0 || denominator <= 0 || numerator > denominator) {
    return invalid('counts must be safe integers with 0 <= numerator <= denominator and denominator > 0');
  }
  const units = reportedUnits(reported, decimals);
  if (units === null || reported < 0 || reported > 100) return invalid('percentage must be in [0, 100] at the reported precision');
  const scale = 10n ** BigInt(decimals);
  const roundedUnits = roundedRatio(BigInt(numerator) * 100n * scale, BigInt(denominator));
  const roundedPercentage = Number(roundedUnits) / Number(scale);
  const matches = roundedUnits === units;
  return {
    status: 'ok', matches, actualPercentage: numerator / denominator * 100, roundedPercentage,
    message: `${numerator}/${denominator} gives ${roundedPercentage.toFixed(decimals)}%; ${matches ? 'matches' : 'does not match'} the reported ${reported.toFixed(decimals)}%`,
  };
}

export interface GrimResult {
  status: ArithmeticStatus;
  possible: boolean | null;
  totals: number[];
  nearestMeans: number[];
  message: string;
}

/** Decimal reports use round-to-nearest, with exact halves away from zero. */
function validDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 12;
}

function reportedUnits(value: number, decimals: number): bigint | null {
  if (!Number.isFinite(value) || !validDecimals(decimals) || Math.abs(value) >= 1e21) return null;
  const fixed = value.toFixed(decimals);
  if (Number(fixed) !== value) return null; // Do not silently change the report's precision.
  return BigInt(fixed.replace('.', ''));
}

/** Round the shortest decimal representation, not a binary toFixed tie artifact. */
function roundedNumberUnits(value: number, decimals: number): bigint {
  const [mantissa, exponent = '0'] = value.toString().split('e');
  const fractionLength = mantissa.split('.')[1]?.length ?? 0;
  const coefficient = BigInt(mantissa.replace('.', ''));
  const power = Number(exponent) - fractionLength + decimals;
  return power >= 0 ? coefficient * 10n ** BigInt(power) : roundedRatio(coefficient, 10n ** BigInt(-power));
}

function floorDivide(a: bigint, b: bigint): bigint {
  const q = a / b;
  return a < 0n && a % b !== 0n ? q - 1n : q;
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const magnitude = numerator < 0n ? -numerator : numerator;
  return sign * ((2n * magnitude + denominator) / (2n * denominator));
}

/**
 * GRIM (Brown & Heathers, 2017): enumerate all integer totals in the rounding
 * window, then round each total/n at the reported precision. Integer rational
 * arithmetic avoids both a single-round(total) shortcut and binary tie errors.
 * Possible does not establish that the items were whole numbers or in range.
 */
export function grim(mean: number, n: number, decimals: number): GrimResult {
  if (n < 0) throw new RangeError('sample size must not be negative');
  const invalid = (message: string): GrimResult => ({
    status: 'invalid', possible: null, totals: [], nearestMeans: [], message,
  });
  if (!Number.isSafeInteger(n) || n === 0) return invalid('sample size must be a positive safe integer');
  const units = reportedUnits(mean, decimals);
  if (units === null) return invalid('mean must be finite and match 0–12 reported decimal places');
  const scale = 10n ** BigInt(decimals);
  const count = BigInt(n);
  const center = units * count;
  const lower = -floorDivide(-(2n * center - count), 2n * scale);
  const upper = floorDivide(2n * center + count, 2n * scale);
  const safe = BigInt(Number.MAX_SAFE_INTEGER);
  if (lower < -safe || upper > safe || upper - lower > 100000n) {
    return invalid('rounding window exceeds safe total enumeration limits');
  }
  const totals: number[] = [];
  for (let total = lower; total <= upper; total++) {
    if (roundedRatio(total * scale, count) === units) totals.push(Number(total));
  }
  const possible = totals.length > 0;
  const below = floorDivide(center, scale);
  const above = -floorDivide(-center, scale);
  const nearestMeans = possible ? [] : [...new Set([Number(below) / n, Number(above) / n])];
  const label = mean.toFixed(decimals);
  return {
    status: 'ok', possible, totals, nearestMeans,
    message: possible
      ? `a mean of ${label} is possible with n = ${n}`
      : `no whole-number total gives a mean of ${label} with n = ${n}; nearest achievable means: ${nearestMeans.join(', ')}`,
  };
}
