import { describe, expect, it } from "vitest";

import { dataDomain, SINGLE_POINT_PADDING_MS, tickFormatter, tickKind } from "./axis";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("tickKind", () => {
    it.each([
        [15 * MINUTE, "seconds"],
        [3 * HOUR, "minutes"],
        [24 * HOUR, "days"],
        [7 * 24 * HOUR, "days"],
    ] as const)("a span of %d ms uses %s", (span, kind) => {
        expect(tickKind(span)).toBe(kind);
    });
});

describe("tickFormatter", () => {
    const moment = new Date(2026, 9, 9, 14, 3, 7).getTime();

    it("shows seconds for minutes, only hours and minutes for hours, the date for days", () => {
        expect(tickFormatter(15 * MINUTE, "en-GB")(moment)).toBe("14:03:07");
        expect(tickFormatter(3 * HOUR, "en-GB")(moment)).toBe("14:03");
        expect(tickFormatter(24 * HOUR, "en-GB")(moment)).toContain("Oct");
    });
});

describe("dataDomain", () => {
    it("runs from the oldest to the newest plotted point", () => {
        expect(dataDomain(1000, 5000)).toEqual([1000, 5000]);
    });

    it("gives a single point a window around it", () => {
        expect(dataDomain(10 * HOUR, 10 * HOUR)).toEqual([10 * HOUR - SINGLE_POINT_PADDING_MS, 10 * HOUR + SINGLE_POINT_PADDING_MS]);
    });
});
