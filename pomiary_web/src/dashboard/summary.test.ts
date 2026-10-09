import { describe, expect, it } from "vitest";

import { presetFilters } from "./range";
import { filterSummary } from "./summary";

describe("filterSummary", () => {
    const now = new Date(2026, 9, 9, 12, 0);

    it("names the preset and counts the series", () => {
        expect(filterSummary(presetFilters("7d", now), 12, 12)).toBe("Last 7 days · 12 of 12 series");
        expect(filterSummary(presetFilters("24h", now), 3, 12)).toBe("Last 24 h · 3 of 12 series");
    });

    it("calls a typed range custom", () => {
        expect(filterSummary({ ...presetFilters("7d", now), preset: null }, 0, 0)).toBe("Custom range · 0 of 0 series");
    });
});
