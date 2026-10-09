import { describe, expect, it } from "vitest";

import { MAX_NAME_LENGTH, validateRegistration } from "./validation";

describe("validateRegistration", () => {
    it("accepts a name and a series", () => {
        expect(validateRegistration({ name: "Roof sensor", seriesId: "3" })).toEqual({});
    });

    it("asks for a name, also when it is only spaces", () => {
        expect(validateRegistration({ name: "   ", seriesId: "3" }).name).toBeDefined();
    });

    it("accepts the longest name and refuses one character more", () => {
        expect(validateRegistration({ name: "a".repeat(MAX_NAME_LENGTH), seriesId: "3" })).toEqual({});
        expect(validateRegistration({ name: "a".repeat(MAX_NAME_LENGTH + 1), seriesId: "3" }).name).toBeDefined();
    });

    it("asks for a series", () => {
        expect(validateRegistration({ name: "x", seriesId: null }).seriesId).toBeDefined();
        expect(validateRegistration({ name: "x", seriesId: "" }).seriesId).toBeDefined();
    });
});
