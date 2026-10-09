import { describe, expect, it } from "vitest";

import { parseSession } from "./storage";

describe("parseSession", () => {
    it("reads a stored session", () => {
        expect(parseSession('{"token":"abc","username":"admin"}')).toEqual({ token: "abc", username: "admin" });
    });

    it("is null when nothing is stored", () => {
        expect(parseSession(null)).toBeNull();
    });

    it("is null for text that is not JSON", () => {
        expect(parseSession("{oops")).toBeNull();
    });

    it("is null for JSON of the wrong shape", () => {
        expect(parseSession("42")).toBeNull();
        expect(parseSession("null")).toBeNull();
        expect(parseSession('{"token":"abc"}')).toBeNull();
        expect(parseSession('{"token":"","username":"admin"}')).toBeNull();
        expect(parseSession('{"token":1,"username":"admin"}')).toBeNull();
    });

    it("ignores extra keys", () => {
        expect(parseSession('{"token":"abc","username":"admin","x":1}')).toEqual({ token: "abc", username: "admin" });
    });
});
