import { describe, expect, it } from "vitest";

import { markerPoints, markerShape } from "./markers";

describe("markerShape", () => {
    it.each(["circle", "square", "triangle", "diamond"] as const)("knows %s", (shape) => {
        expect(markerShape(shape)).toBe(shape);
    });

    it("ignores case and spaces", () => {
        expect(markerShape("  Diamond ")).toBe("diamond");
    });

    it("falls back to a circle", () => {
        expect(markerShape("thermometer")).toBe("circle");
        expect(markerShape(null)).toBe("circle");
        expect(markerShape(undefined)).toBe("circle");
    });
});

describe("markerPoints", () => {
    it("has no polygon for a circle", () => {
        expect(markerPoints("circle", 5, 5, 2)).toBeNull();
    });

    it("draws the other shapes around the centre", () => {
        expect(markerPoints("square", 5, 5, 2)).toBe("3,3 7,3 7,7 3,7");
        expect(markerPoints("triangle", 5, 5, 2)).toBe("5,3 7,7 3,7");
        expect(markerPoints("diamond", 5, 5, 2)).toBe("5,3 7,5 5,7 3,5");
    });
});
