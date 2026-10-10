import { describe, expect, it } from "vitest";

import { tickFormatter, tickKind } from "./axis";

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
