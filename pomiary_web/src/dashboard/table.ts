// The table's rows and the charts' points, built from the same measurements (F2).
import type { Measurement } from "./api";

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
