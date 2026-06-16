/** Extract tunable single-letter parameters from expression (excluding x, y, theta, e) */
const RESERVED = new Set(['x', 'y', 't', 'e', 'pi', 'theta']);

export function extractParams(expr: string): string[] {
  const normalized = expr.replace(/θ/g, 'theta');
  const matches = normalized.match(/\b[a-zA-Z]\b/g) || [];
  const found = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!RESERVED.has(lower)) found.add(lower);
  }
  return [...found].sort();
}

export function defaultParamValue(name: string): number {
  const defaults: Record<string, number> = {
    a: 1, b: 1, c: 0, d: 0, k: 1, m: 1, n: 1,
  };
  return defaults[name] ?? 1;
}
