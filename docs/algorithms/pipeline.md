# Algorithm Pipeline Specification

Phase 0 architecture: UI (`src/lib`, `src/components`) ↔ Engine (`src/engine`).

## Data flow

```
Raw stroke (MathPoint[])
  → [sketch] mergeCartesianStroke / mergePolarStroke
  → [pipeline] preprocessCartesianStroke
      1. projectMonotonicX  (median per x-bin)
      2. savitzkyGolay      (noise reduction)
      3. samplePolylineAdaptive (curvature-aware resample)
  → [pipeline] fitFunctionData
  → [lib] attachCartesian / attachPolar (LaTeX display)
  → GraphObject on canvas
```

## Stages

| Stage | Module | Input | Output |
|-------|--------|-------|--------|
| 1. Capture | `engine/sketch` | pointer events | monotonic polyline |
| 2a. Monotonic | `engine/geometry/monotonic` | raw points | one y per x-bin |
| 2b. Smooth | `engine/geometry/smooth` | monotonic points | SG-filtered y |
| 2c. Resample | `engine/geometry/sampling` | smoothed polyline | dense samples |
| 3. Fit | `engine/fit` | samples + method | `FitEquationResult` |
| 4. Attach | `lib/fit-models` | fit + sketch | `FunctionSketch.equation` |
| 5. Render | `lib/canvas-renderer` | evaluate fn | canvas paths |

## Core type: `FunctionData`

```typescript
interface FunctionData {
  domain: { min, max, variable: 'x' | 'theta' };
  samples: MathPoint[];
  evaluate?: (t: number) => number;
  metadata: {
    source, rawPointCount, processedPointCount?,
    postprocess?: { monotonicPointCount, smoothed },
    fitMethod?, rSquared?
  };
}
```

## Preprocess options

```typescript
interface PreprocessOptions {
  binCount?: number;       // monotonic x-bins
  smooth?: boolean;        // default true
  smoothWindow?: number;   // default 5 (SG)
  stepMath?: number;       // resample step
  adaptiveResample?: boolean; // finer at bends
}
```

## Fitting methods (cartesian)

| ID | Model |
|----|-------|
| `linear` | y = a + bx |
| `polynomial` | Σ cᵢxⁱ (AIC auto degree ≤ 6) |
| `trigonometric` | Fourier sin/cos (adaptive harmonics) |
| `exponential` | a·e^(bx) |
| `power` | a·x^b |
| `logarithmic` | a + b·ln(x) |
| `auto` | best R² among above |

## Numeric core (Phase 1)

| Component | Implementation |
|-----------|----------------|
| Least squares | Householder QR (`engine/numeric/qr`) |
| Polynomial basis | Scaled monomial t = (x − μ) / σ |
| Degree selection | AIC when `autoDegree: true` |
| Condition estimate | cond ≈ \|R₀₀\| / \|Rₙₙ\| |

## Postprocess (Phase 2)

| Component | Implementation |
|-----------|----------------|
| Monotonic projection | x-bin median (`projectMonotonicX`) |
| Smoothing | Savitzky–Golay window 5 (`savitzkyGolay`) |
| Resampling | Curvature-adaptive polyline (`samplePolylineAdaptive`) |

R² = 1 − SS_res / SS_tot

## Golden tests

See `tests/fixtures/fit-cases.json`. Run:

```bash
npm test
```

## Phase 3 (current)

| Component | Implementation |
|-----------|----------------|
| PCHIP spline | `engine/fit/pchip` — monotonic cubic Hermite |
| Fit diagnostics | RMSE, max residual, sample count on `FitEquationResult` |
| Fit report UI | Algebra panel — 근사 리포트 (selected sketch) |
| Web Worker | `engine/worker/fit.worker.ts` — async pipeline via `lib/fit-async` |

PCHIP is excluded from `auto` mode (always R²≈1 on training samples).

## Phase 4+ placeholders

- Natural cubic spline / smoothing spline
- Residual plot canvas
- Project save of `modelData` without refit
