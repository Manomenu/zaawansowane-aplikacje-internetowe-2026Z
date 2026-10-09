import { describe, expect, it } from "vitest";

import { buildGeneratorCommand, formatMoment } from "./command";

describe("buildGeneratorCommand", () => {
    it("puts the origin, the key and the series range into the generator's flags", () => {
        const command = buildGeneratorCommand({ api: "http://localhost:8092", apiKey: "k3y", minValue: -10, maxValue: 37.5 });

        expect(command).toBe(
            "python -m pomiary_generator send --api http://localhost:8092 --api-key k3y --interval 5s --source synthetic --shape sine --min -10 --max 37.5",
        );
    });
});

describe("formatMoment", () => {
    it("says never for a sensor without measurements", () => {
        expect(formatMoment(null)).toBe("never");
    });

    it("formats a moment in the reader's locale", () => {
        const iso = "2026-10-09T10:00:00Z";
        expect(formatMoment(iso)).toBe(new Date(iso).toLocaleString());
    });
});
