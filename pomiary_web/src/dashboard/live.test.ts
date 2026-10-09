import { describe, expect, it } from "vitest";

import type { Measurement } from "./api";
import { mergeLive, parseMeasurement, streamUrl } from "./live";

const make = (id: number, timestamp: string): Measurement => ({ id, seriesId: 1, sensorId: 2, value: 3, timestamp });
const FROM = new Date("2026-10-01T00:00:00Z").getTime();
const TO = new Date("2026-10-02T00:00:00Z").getTime();

describe("parseMeasurement", () => {
    it("reads a measurement", () => {
        const data = JSON.stringify(make(5, "2026-10-01T10:00:00Z"));
        expect(parseMeasurement(data)).toEqual(make(5, "2026-10-01T10:00:00Z"));
    });

    it("turns a missing sensor into null", () => {
        const data = JSON.stringify({ id: 1, seriesId: 1, value: 1, timestamp: "2026-10-01T10:00:00Z" });
        expect(parseMeasurement(data)?.sensorId).toBeNull();
    });

    it.each([
        "",
        "not json",
        "[]",
        "null",
        '{"id":1}',
        '{"id":1,"seriesId":1,"value":"3","timestamp":"2026-10-01T10:00:00Z"}',
        '{"id":1,"seriesId":1,"value":3,"timestamp":"x"}',
    ])("rejects %j", (data) => {
        expect(parseMeasurement(data)).toBeNull();
    });
});

describe("mergeLive", () => {
    const existing = [make(1, "2026-10-01T10:00:00Z")];

    it("adds a new measurement in front", () => {
        const next = mergeLive(existing, make(2, "2026-10-01T11:00:00Z"), FROM, TO);
        expect(next.map((x) => x.id)).toEqual([2, 1]);
    });

    it("ignores one it already has, returning the same array", () => {
        expect(mergeLive(existing, make(1, "2026-10-01T10:00:00Z"), FROM, TO)).toBe(existing);
    });

    it("ignores one before the start or after the end", () => {
        expect(mergeLive(existing, make(2, "2026-09-30T23:59:59Z"), FROM, TO)).toBe(existing);
        expect(mergeLive(existing, make(3, "2026-10-02T00:00:01Z"), FROM, TO)).toBe(existing);
    });

    it("accepts any later one when the range has no end", () => {
        expect(mergeLive(existing, make(4, "2030-01-01T00:00:00Z"), FROM, null)).toHaveLength(2);
    });
});

describe("streamUrl", () => {
    it("lists the series ids", () => {
        expect(streamUrl([1, 4])).toMatch(/\/measurements\/stream\?series=1,4$/);
    });
});
