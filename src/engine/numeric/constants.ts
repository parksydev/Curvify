/** Coefficient magnitudes below this are treated as zero in display. */
export const COEF_DISPLAY_EPS = 1e-4;

/** Pivot threshold for Gaussian elimination. */
export const LINEAR_PIVOT_EPS = 1e-12;

/** Warn when estimated condition number exceeds this (ill-conditioned fit). */
export const COND_WARN_THRESHOLD = 1e8;

/** Reject fits above this condition estimate. */
export const COND_REJECT_THRESHOLD = 1e14;

/** Minimum pivot / diagonal magnitude in back-substitution. */
export const QR_PIVOT_EPS = 1e-14;
