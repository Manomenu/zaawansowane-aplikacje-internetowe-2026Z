import { describe, expect, it } from "vitest";

import { ApiError } from "../api/client";
import { failureOf, MAX_NAME_LENGTH, MAX_UNIT_LENGTH, shapeOf, toInput, validateSeries, type SeriesDraft } from "./validation";

const valid: SeriesDraft = { name: "Soil moisture", unit: "%", minValue: 0, maxValue: 100, color: "#1c7ed6", icon: "square" };

describe("validateSeries", () => {
    it("accepts a complete draft", () => {
        expect(validateSeries(valid, [])).toEqual({});
    });

    it("requires a name and caps its length", () => {
        expect(validateSeries({ ...valid, name: "   " }, []).name).toBe("Enter the name.");
        expect(validateSeries({ ...valid, name: "x".repeat(MAX_NAME_LENGTH) }, []).name).toBeUndefined();
        expect(validateSeries({ ...valid, name: "x".repeat(MAX_NAME_LENGTH + 1) }, []).name).toContain("at most 100");
    });

    it("refuses a name another series has, ignoring case and edge spaces", () => {
        const taken = ["Air temperature"];
        expect(validateSeries({ ...valid, name: "air TEMPERATURE " }, taken).name).toBe("A series with this name already exists");
        expect(validateSeries({ ...valid, name: "Air temperature 2" }, taken).name).toBeUndefined();
    });

    it("allows an empty unit and caps its length", () => {
        expect(validateSeries({ ...valid, unit: "" }, []).unit).toBeUndefined();
        expect(validateSeries({ ...valid, unit: "u".repeat(MAX_UNIT_LENGTH + 1) }, []).unit).toContain("at most 20");
    });

    it("needs finite numbers for the range", () => {
        const errors = validateSeries({ ...valid, minValue: "", maxValue: Number.POSITIVE_INFINITY }, []);
        expect(errors.minValue).toBe("Enter the minimum as a number.");
        expect(errors.maxValue).toBe("Enter the maximum as a number.");
    });

    it("needs the minimum below the maximum, with the message under the maximum", () => {
        expect(validateSeries({ ...valid, minValue: 5, maxValue: 5 }, []).maxValue).toBe("The maximum must be greater than the minimum.");
        expect(validateSeries({ ...valid, minValue: 6, maxValue: 5 }, []).maxValue).toBeDefined();
        expect(validateSeries({ ...valid, minValue: -5, maxValue: 5 }, []).maxValue).toBeUndefined();
    });

    it("needs a #RRGGBB colour", () => {
        expect(validateSeries({ ...valid, color: "red" }, []).color).toBeDefined();
        expect(validateSeries({ ...valid, color: "#12345" }, []).color).toBeDefined();
        expect(validateSeries({ ...valid, color: "#AbCdEf" }, []).color).toBeUndefined();
    });
});

describe("toInput", () => {
    it("trims, and turns an empty unit into null", () => {
        expect(toInput({ ...valid, name: "  Soil  ", unit: " " })).toEqual({
            name: "Soil",
            unit: null,
            minValue: 0,
            maxValue: 100,
            color: "#1c7ed6",
            icon: "square",
        });
    });
});

describe("shapeOf", () => {
    it("knows the four shapes and falls back to a circle", () => {
        expect(shapeOf("diamond")).toBe("diamond");
        expect(shapeOf("star")).toBe("circle");
        expect(shapeOf(null)).toBe("circle");
    });
});

describe("failureOf", () => {
    it("ends the session on 401", () => {
        expect(failureOf(new ApiError(401, "no")).unauthorized).toBe(true);
    });

    it("puts a 409 under both range fields", () => {
        const failure = failureOf(new ApiError(409, "Measurements outside the range exist."));
        expect(failure.fields).toEqual({
            minValue: "Measurements outside the range exist.",
            maxValue: "Measurements outside the range exist.",
        });
        expect(failure.alert).toBeNull();
    });

    it("puts a 422 under the fields it names, without an alert", () => {
        const failure = failureOf(new ApiError(422, "Invalid", { maxValue: "must be greater" }));
        expect(failure.fields).toEqual({ maxValue: "must be greater" });
        expect(failure.alert).toBeNull();
    });

    it("shows what fits no field in an alert", () => {
        expect(failureOf(new ApiError(500, "Boom")).alert).toBe("Boom");
        expect(failureOf(new ApiError(0, "Offline")).alert).toBe("Offline");
        expect(failureOf(new ApiError(422, "Invalid")).alert).toBe("Invalid");
    });
});
