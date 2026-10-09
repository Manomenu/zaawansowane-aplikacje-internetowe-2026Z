import { describe, expect, it } from "vitest";

import type { Series } from "./api";
import { NO_UNIT_LABEL, groupByUnit, toggleSeries, toggleUnit, unitState, visibleSeries } from "./grouping";

const make = (id: number, unit: string | null): Series => ({
    id,
    name: `S${id}`,
    minValue: 0,
    maxValue: 10,
    color: "#112233",
    icon: null,
    unit,
});

const SERIES = [make(1, "°C"), make(2, "mm"), make(3, "°C"), make(4, null)];

describe("groupByUnit", () => {
    it("groups by unit in order of first appearance", () => {
        expect(groupByUnit(SERIES).map((g) => [g.label, g.series.map((s) => s.id)])).toEqual([
            ["°C", [1, 3]],
            ["mm", [2]],
            [NO_UNIT_LABEL, [4]],
        ]);
    });

    it("is empty for no series", () => {
        expect(groupByUnit([])).toEqual([]);
    });
});

describe("visibility", () => {
    const celsius = groupByUnit(SERIES)[0];
    if (celsius === undefined) throw new Error("no group");

    it("shows everything by default", () => {
        expect(visibleSeries(SERIES, new Set())).toHaveLength(4);
        expect(unitState(celsius, new Set())).toBe("all");
    });

    it("hides and shows one series", () => {
        const hidden = toggleSeries(new Set(), 1);
        expect(visibleSeries(SERIES, hidden).map((s) => s.id)).toEqual([2, 3, 4]);
        expect(unitState(celsius, hidden)).toBe("some");
        expect(toggleSeries(hidden, 1).size).toBe(0);
    });

    it("toggles a whole unit off, then on again", () => {
        const off = toggleUnit(new Set(), celsius);
        expect(unitState(celsius, off)).toBe("none");
        expect(toggleUnit(off, celsius).size).toBe(0);
    });

    it("turns a half-visible unit fully on", () => {
        expect(toggleUnit(new Set([1]), celsius).size).toBe(0);
    });
});
