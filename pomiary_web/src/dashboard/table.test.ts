import { describe, expect, it } from "vitest";

import type { Measurement } from "./api";
import { buildRows, chartPoints, pointKey } from "./table";

const m = (id: number, seriesId: number, value: number, timestamp: string): Measurement => ({
    id,
    seriesId,
    sensorId: null,
    value,
    timestamp,
});

const T1 = "2026-10-09T10:00:00Z";
const T2 = "2026-10-09T11:00:00Z";
const T3 = "2026-10-09T12:00:00Z";
const MEASUREMENTS = [m(1, 1, 5, T1), m(2, 2, 7, T1), m(3, 1, 6, T2), m(4, 2, 8, T3), m(5, 3, 9, T3)];

describe("buildRows", () => {
    it("has one row per timestamp, newest first, over the union of the series", () => {
        const rows = buildRows(MEASUREMENTS, new Set([1, 2]));
        expect(rows.map((r) => new Date(r.ms).toISOString())).toEqual([
            "2026-10-09T12:00:00.000Z",
            "2026-10-09T11:00:00.000Z",
            "2026-10-09T10:00:00.000Z",
        ]);
    });

    it("leaves a series without a value out of its row", () => {
        const [newest, middle, oldest] = buildRows(MEASUREMENTS, new Set([1, 2]));
        expect([...(newest?.values ?? [])]).toEqual([[2, 8]]);
        expect([...(middle?.values ?? [])]).toEqual([[1, 6]]);
        expect(oldest?.values.get(1)).toBe(5);
        expect(oldest?.values.get(2)).toBe(7);
    });

    it("drops series that are not visible and the rows only they had", () => {
        expect(buildRows(MEASUREMENTS, new Set([1]))).toHaveLength(2);
        expect(buildRows(MEASUREMENTS, new Set())).toEqual([]);
    });
});

describe("chartPoints", () => {
    it("lists the points oldest first with only the unit's series", () => {
        const rows = buildRows(MEASUREMENTS, new Set([1, 2, 3]));
        expect(chartPoints(rows, [1])).toEqual([
            { t: new Date(T1).getTime(), [pointKey(1)]: 5 },
            { t: new Date(T2).getTime(), [pointKey(1)]: 6 },
        ]);
    });
});
