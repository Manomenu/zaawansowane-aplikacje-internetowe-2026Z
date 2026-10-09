// Steps the browser tests share. The administrator exists because playwright.config.ts starts
// the server with these credentials.
import { expect, type Page } from "@playwright/test";

export const ADMIN_USERNAME = "e2e-admin";
export const ADMIN_PASSWORD = "e2e-only-password";

/** Opens the page and logs in through the header's dialog; the admin tabs are there afterwards. */
export async function logIn(page: Page, password = ADMIN_PASSWORD): Promise<void> {
    await page.goto("/");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Username", { exact: true }).fill(ADMIN_USERNAME);
    await dialog.getByLabel("Password", { exact: true }).fill(password);
    await dialog.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByText(`Logged in as ${ADMIN_USERNAME}`, { exact: true })).toBeVisible();
}
