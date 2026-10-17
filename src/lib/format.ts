export function roman(value: number): string {
  const numerals: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let remaining = Math.max(0, Math.floor(value));
  let result = '';
  for (const [amount, text] of numerals) {
    while (remaining >= amount) { result += text; remaining -= amount; }
  }
  return result;
}
export function percent(value: number): string { return `${Math.round(value * 100)}%`; }
