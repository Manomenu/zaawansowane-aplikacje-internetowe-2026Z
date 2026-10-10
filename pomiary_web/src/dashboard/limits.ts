// No imports on purpose: the browser tests (compiled without the app's Vite types) read this too.

/** The table renders at most this many rows (the newest); the charts keep every point. */
export const MAX_ROWS = 500;

/** Width of the time column, in rem (the same 5.5rem as `dashboard.css`). */
export const TIME_COLUMN_REM = 5.5;
/** The narrowest a series column gets: a header like "Suwałki: Soil moisture (%)" still reads in a
 * few short lines. As many columns as fit at this width share the box; more scroll inside it. */
export const SERIES_COLUMN_MIN_REM = 5;
