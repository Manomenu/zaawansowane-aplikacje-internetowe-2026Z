// Steps the browser tests share. The administrator exists because playwright.config.ts starts
// the server with these credentials.
import AxeBuilder from "@axe-core/playwright";
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

export type ColorScheme = "light" | "dark";

/** WCAG 2.0, 2.1 and 2.2 levels A and AA: what T6 asks for. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Runs axe on the page as it is now and fails with every violation, its selector and the reason.
 * Mantine fades modals in; axe would read colours in the middle of the fade, so it waits until
 * every dialog is fully opaque first.
 */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
    for (const dialog of await page.getByRole("dialog").all()) {
        await expect(dialog).toHaveCSS("opacity", "1");
        await expect(dialog).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    }
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const report = violations.map(
        (v) =>
            `${v.id} (${v.impact ?? "?"}): ${v.help}\n` +
            v.nodes.map((n) => `  ${n.target.join(" ")}\n    ${n.failureSummary ?? ""}`).join("\n"),
    );
    expect(report, report.join("\n")).toEqual([]);
}
