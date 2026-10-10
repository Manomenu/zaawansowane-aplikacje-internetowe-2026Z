import { describe, expect, it } from "vitest";

import {
    DEFAULT_PRESET,
    LIVE_GRACE_MS,
    PRESETS,
    editedFilters,
    parseInputValue,
    presetFilters,
    requestRange,
    toInputValue,
    validateRange,
} from "./range";

const NOW = new Date(2026, 9, 9, 14, 30, 45);

describe("input values", () => {
    it("formats local time to the minute", () => {
        expect(toInputValue(NOW)).toBe("2026-10-09T14:30");
    });

    it("parses what it formats and rejects empty or broken text", () => {
        expect(parseInputValue("2026-10-09T14:30")).toBe(new Date(2026, 9, 9, 14, 30).getTime());
        expect(parseInputValue("")).toBeNull();
        expect(parseInputValue("2026-10")).toBeNull();
    });
});

describe("presets", () => {
    it("are ordered shortest first, 90 days is the default", () => {
        expect(PRESETS.map((p) => p.label)).toEqual(["15 min", "3 h", "24 h", "7 days", "30 days", "90 days"]);
        expect(PRESETS.map((p) => p.minutes)).toEqual([15, 180, 1440, 10_080, 43_200, 129_600]);
        expect(DEFAULT_PRESET).toBe("90d");
    });

    it.each(PRESETS)("$label ends now and starts $minutes minutes before", ({ value, minutes }) => {
        const filters = presetFilters(value, NOW);
        const check = validateRange(filters);
        expect(filters.preset).toBe(value);
        expect(filters.live).toBe(true);
        expect(check.ok && check.toMs - check.fromMs).toBe(minutes * 60_000);
    });
});

describe("editing", () => {
    const preset = presetFilters("7d", NOW);

    it("drops the preset", () => {
        expect(editedFilters(preset, "from", "2026-10-01T00:00", NOW).preset).toBeNull();
    });

    it("stays live while the end is within the grace period of now", () => {
        const near = toInputValue(new Date(NOW.getTime() - LIVE_GRACE_MS + 60_000));
        expect(editedFilters(preset, "to", near, NOW).live).toBe(true);
    });

    it("is not live for an end in the past or an empty one", () => {
        expect(editedFilters(preset, "to", "2026-10-01T00:00", NOW).live).toBe(false);
        expect(editedFilters(preset, "to", "", NOW).live).toBe(false);
    });
});

describe("validation", () => {
    const base = { preset: null, live: false } as const;

    it("accepts from before or equal to to", () => {
        expect(validateRange({ ...base, from: "2026-10-01T00:00", to: "2026-10-01T00:00" }).ok).toBe(true);
    });

    it("refuses from after to", () => {
        const check = validateRange({ ...base, from: "2026-10-02T00:00", to: "2026-10-01T00:00" });
        expect(check).toEqual({ ok: false, message: "The start must not be after the end." });
    });

    it("refuses an empty end", () => {
        expect(validateRange({ ...base, from: "2026-10-02T00:00", to: "" }).ok).toBe(false);
    });
});

describe("requestRange", () => {
    it("leaves the end out for a live range", () => {
        expect(requestRange(0, 1000, true).to).toBeUndefined();
    });

    it("ends a fixed range with its last millisecond of the minute", () => {
        expect(requestRange(0, 0, false)).toEqual({ from: "1970-01-01T00:00:00.000Z", to: "1970-01-01T00:00:59.999Z" });
    });
});
