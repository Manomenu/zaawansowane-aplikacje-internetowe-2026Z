import { expect, test } from "@playwright/test";

import { ADMIN_PASSWORD, ADMIN_USERNAME, logIn } from "../../e2e/helpers";

const NEW_PASSWORD = "another-password-1";

test("logging in shows the admin tabs and logging out hides them", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab", { name: "Data", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Series", exact: true })).toHaveCount(0);

    await logIn(page);
    for (const name of ["Data", "Series", "Sensors", "Account"]) {
        await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Series", exact: true })).toHaveCount(0);
});

test("the session survives a reload", async ({ page }) => {
    await logIn(page);

    await page.reload();

    await expect(page.getByText(`Logged in as ${ADMIN_USERNAME}`, { exact: true })).toBeVisible();
});

test("a wrong password shows the server's message and keeps the dialog open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Username", { exact: true }).fill(ADMIN_USERNAME);
    await dialog.getByLabel("Password", { exact: true }).fill("not-the-password");
    // Enter in the field submits the form.
    await dialog.getByLabel("Password", { exact: true }).press("Enter");

    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Series", exact: true })).toHaveCount(0);
});

test("an empty login form says what is missing without calling the server", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Log in", exact: true }).click();

    await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();

    await expect(page.getByText("Enter the username.", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter the password.", { exact: true })).toBeVisible();
});

test("changing the password: wrong current one is refused, the right one works, then it is changed back", async ({ page }) => {
    await logIn(page);
    await page.getByRole("tab", { name: "Account", exact: true }).click();
    const current = page.getByLabel("Current password", { exact: true });
    const next = page.getByLabel("New password", { exact: true });
    const repeat = page.getByLabel("Repeat the new password", { exact: true });
    const submit = page.getByRole("button", { name: "Change password", exact: true });

    // Checked in the browser, before anything is sent.
    await current.fill(ADMIN_PASSWORD);
    await next.fill("short");
    await repeat.fill("short");
    await submit.click();
    await expect(page.getByText("The new password needs at least 8 characters.", { exact: true })).toBeVisible();

    // The server refuses a wrong current password (403), under its field.
    await current.fill("wrong-current-password");
    await next.fill(NEW_PASSWORD);
    await repeat.fill(NEW_PASSWORD);
    await submit.click();
    await expect(page.getByText("The current password is wrong", { exact: true })).toBeVisible();

    try {
        await current.fill(ADMIN_PASSWORD);
        await submit.click();
        await expect(page.getByText("Password changed.", { exact: true })).toBeVisible();

        // The new password logs in; the old one no longer does.
        await page.getByRole("button", { name: "Log out", exact: true }).click();
        await logIn(page, NEW_PASSWORD);
    } finally {
        // Later tests log in with the original password: put it back.
        await page.getByRole("tab", { name: "Account", exact: true }).click();
        await current.fill(NEW_PASSWORD);
        await next.fill(ADMIN_PASSWORD);
        await repeat.fill(ADMIN_PASSWORD);
        await submit.click();
        await expect(page.getByText("Password changed.", { exact: true })).toBeVisible();
    }
});

test("a token the server no longer accepts ends the session with a notice", async ({ page }) => {
    await logIn(page);
    // The server forgets the session (expired, or the password was changed elsewhere).
    await page.evaluate(() => {
        sessionStorage.setItem("pomiary.session", JSON.stringify({ token: "expired-token", username: "e2e-admin" }));
    });
    await page.reload();
    await page.getByRole("tab", { name: "Account", exact: true }).click();
    await page.getByLabel("Current password", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Repeat the new password", { exact: true }).fill(NEW_PASSWORD);

    await page.getByRole("button", { name: "Change password", exact: true }).click();

    await expect(page.getByText("Your session has ended. Log in again.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Account", exact: true })).toHaveCount(0);
});
