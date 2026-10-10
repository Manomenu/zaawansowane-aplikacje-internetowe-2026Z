// The table's rows and the charts' points, built from the same measurements (F2).
import type { Measurement } from "./api";
import { MAX_ROWS, SERIES_COLUMN_MIN_REM, TIME_COLUMN_REM } from "./limits";

export interface TableRow {
    /** The timestamp in ms: the row's identity. */
    ms: number;
    values: ReadonlyMap<number, number>;
}

/** One row per timestamp present for any of the series, newest first. */
export function buildRows(measurements: readonly Measurement[], seriesIds: ReadonlySet<number>): TableRow[] {
    const rows = new Map<number, Map<number, number>>();
    for (const m of measurements) {
        if (!seriesIds.has(m.seriesId)) continue;
        const ms = new Date(m.timestamp).getTime();
        const values = rows.get(ms) ?? new Map<number, number>();
        values.set(m.seriesId, m.value);
        rows.set(ms, values);
    }
    return [...rows.entries()].map(([ms, values]) => ({ ms, values })).sort((a, b) => b.ms - a.ms);
}

/** The least width, in rem, the table keeps for `count` series columns. */
export function tableMinWidthRem(count: number): number {
    return TIME_COLUMN_REM + count * SERIES_COLUMN_MIN_REM;
}

/** The key of a series' value in a chart point. */
export const pointKey = (seriesId: number): string => `s${seriesId}`;

/** A chart point: `t` (ms) plus one value per series that has one at that moment. */
export type ChartPoint = Record<string, number>;

/** The points of one chart, oldest first; a series without a value at a moment has no key there. */
export function chartPoints(rows: readonly TableRow[], seriesIds: readonly number[]): ChartPoint[] {
    const points: ChartPoint[] = [];
    for (const row of [...rows].reverse()) {
        const point: ChartPoint = { t: row.ms };
        let any = false;
        for (const id of seriesIds) {
            const value = row.values.get(id);
            if (value === undefined) continue;
            point[pointKey(id)] = value;
            any = true;
        }
        if (any) points.push(point);
    }
    return points;
}

/** The rows to render and a line saying so when some were left out (it prints too), or null. */
export function capRows(rows: readonly TableRow[], locale?: string): { shown: readonly TableRow[]; note: string | null } {
    if (rows.length <= MAX_ROWS) return { shown: rows, note: null };
    const format = new Intl.NumberFormat(locale);
    return {
        shown: rows.slice(0, MAX_ROWS),
        note: `Showing the newest ${format.format(MAX_ROWS)} of ${format.format(rows.length)} rows`,
    };
}

/** A notice when the request hit the server's limit, so the oldest measurements of the range are missing; else null. */
export function limitNotice(received: number, limit: number, locale?: string): string | null {
    if (received < limit) return null;
    const n = new Intl.NumberFormat(locale).format(limit);
    return `Showing the newest ${n} measurements of this range - narrow the range to see all.`;
}
