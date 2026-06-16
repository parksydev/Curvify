import { QR_PIVOT_EPS } from './constants';

export interface LeastSquaresResult {
  coeffs: number[];
  /** Estimated cond(R) ≈ |R₀₀| / |Rₙₙ|. */
  conditionEstimate: number;
  rank: number;
  residualNormSq: number;
}

/**
 * Solve min ‖Ax − b‖₂ via Householder QR (m ≥ n).
 * A is m×n, b length m.
 */
export function leastSquares(A: number[][], b: number[]): LeastSquaresResult | null {
  const m = A.length;
  if (m === 0) return null;
  const n = A[0].length;
  if (n === 0 || b.length !== m) return null;

  const R: number[][] = A.map((row) => [...row]);
  const y = [...b];

  for (let k = 0; k < n; k++) {
    let normX = 0;
    for (let i = k; i < m; i++) normX += R[i][k] * R[i][k];
    normX = Math.sqrt(normX);
    if (normX < QR_PIVOT_EPS) continue;

    const alpha = R[k][k] >= 0 ? -normX : normX;
    const v: number[] = new Array(m).fill(0);
    v[k] = R[k][k] - alpha;
    let vNormSq = v[k] * v[k];
    for (let i = k + 1; i < m; i++) {
      v[i] = R[i][k];
      vNormSq += v[i] * v[i];
    }
    if (vNormSq < QR_PIVOT_EPS) continue;
    const beta = 2 / vNormSq;

    R[k][k] = alpha;
    for (let j = k + 1; j < n; j++) {
      let dot = 0;
      for (let i = k; i < m; i++) dot += v[i] * R[i][j];
      for (let i = k; i < m; i++) R[i][j] -= beta * dot * v[i];
    }
    let dotY = 0;
    for (let i = k; i < m; i++) dotY += v[i] * y[i];
    for (let i = k; i < m; i++) y[i] -= beta * dotY * v[i];
  }

  const coeffs = new Array(n).fill(0);
  let rank = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(R[i][i]) >= QR_PIVOT_EPS) rank++;
  }
  if (rank === 0) return null;

  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(R[i][i]) < QR_PIVOT_EPS) {
      coeffs[i] = 0;
      continue;
    }
    let sum = y[i];
    for (let j = i + 1; j < n; j++) sum -= R[i][j] * coeffs[j];
    coeffs[i] = sum / R[i][i];
  }

  let residualNormSq = 0;
  for (let i = rank; i < m; i++) residualNormSq += y[i] * y[i];

  const r00 = Math.abs(R[0][0]);
  const rnn = Math.abs(R[rank - 1][rank - 1]);
  const conditionEstimate =
    rnn > QR_PIVOT_EPS && r00 > QR_PIVOT_EPS ? r00 / rnn : Number.POSITIVE_INFINITY;

  return { coeffs, conditionEstimate, rank, residualNormSq };
}

/** Square system via QR (n = m). */
export function solveSquare(A: number[][], b: number[]): number[] | null {
  return leastSquares(A, b)?.coeffs ?? null;
}

export function conditionWarning(cond: number): string | undefined {
  if (!Number.isFinite(cond) || cond < 1e8) return undefined;
  if (cond >= 1e14) return '수치적으로 불안정합니다. 차수를 낮추거나 데이터 범위를 줄이세요.';
  return '조건수가 높습니다. 근사 결과에 오차가 클 수 있습니다.';
}
