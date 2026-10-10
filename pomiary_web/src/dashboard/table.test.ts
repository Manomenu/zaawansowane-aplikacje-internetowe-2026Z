import { describe, expect, it } from "vitest";

import type { Measurement } from "./api";
import { MAX_ROWS } from "./limits";
import { buildRows, capRows, chartPoints, limitNotice, pointKey } from "./table";

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

describe("capRows", () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ ms: n - i, values: new Map<number, number>() }));

    it("leaves a short table alone", () => {
        const all = rows(MAX_ROWS);
        expect(capRows(all, "en")).toEqual({ shown: all, note: null });
    });

    it("keeps the newest rows (the first ones) and says how many of how many", () => {
        const { shown, note } = capRows(rows(10_800), "en");
        expect(shown).toHaveLength(MAX_ROWS);
        expect(shown[0]?.ms).toBe(10_800);
        expect(note).toBe(`Showing the newest ${String(MAX_ROWS)} of 10,800 rows`);
    });

    it("formats the numbers for the locale", () => {
        expect(capRows(rows(10_800), "de").note).toContain("10.800");
    });
});

describe("limitNotice", () => {
    it("is silent below the limit and a status text at it", () => {
        expect(limitNotice(9_999, 10_000, "en")).toBeNull();
        expect(limitNotice(10_000, 10_000, "en")).toBe(
            "Showing the newest 10,000 measurements of this range - narrow the range to see all.",
        );
    });
});
