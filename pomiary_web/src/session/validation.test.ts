import { describe, expect, it } from "vitest";

import { MIN_PASSWORD_LENGTH, validateLogin, validatePasswordChange } from "./validation";

describe("validateLogin", () => {
    it("accepts a username and a password", () => {
        expect(validateLogin({ username: "admin", password: "x" })).toEqual({});
    });

    it("requires both, a blank username counts as empty", () => {
        expect(Object.keys(validateLogin({ username: "  ", password: "" }))).toEqual(["username", "password"]);
    });
});

describe("validatePasswordChange", () => {
    const valid = { currentPassword: "old-password", newPassword: "new-password", confirmPassword: "new-password" };

    it("accepts a valid change", () => {
        expect(validatePasswordChange(valid)).toEqual({});
    });

    it("requires the current password", () => {
        expect(validatePasswordChange({ ...valid, currentPassword: "" })).toHaveProperty("currentPassword");
    });

    it("requires a new password of the minimum length", () => {
        const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);

        expect(validatePasswordChange({ ...valid, newPassword: short, confirmPassword: short })).toHaveProperty("newPassword");
        const exact = "a".repeat(MIN_PASSWORD_LENGTH);
        expect(validatePasswordChange({ ...valid, newPassword: exact, confirmPassword: exact })).toEqual({});
    });

    it("requires the new password to differ from the current one", () => {
        const same = { currentPassword: "same-password", newPassword: "same-password", confirmPassword: "same-password" };

        expect(validatePasswordChange(same)).toHaveProperty("newPassword");
    });

    it("requires the confirmation to match", () => {
        expect(validatePasswordChange({ ...valid, confirmPassword: "other-password" })).toHaveProperty("confirmPassword");
    });
});
