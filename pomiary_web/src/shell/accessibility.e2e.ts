// T6 / A5: axe (WCAG 2.0 to 2.2, A and AA) on every screen and dialog, in both colour schemes.
// It sits in shell/ because it crosses every feature; the per-feature tests check behaviour.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { ADMIN_PASSWORD, ADMIN_USERNAME, expectNoAccessibilityViolations, logIn, type ColorScheme } from "../../e2e/helpers";

const SCHEMES: readonly ColorScheme[] = ["light", "dark"];
const HOUR_MS = 3_600_000;
const POINTS = 6;

/** A series with a sensor and a few measurements, so the charts and the table have data. */
async function seed(request: APIRequestContext): Promise<string> {
    const now = Date.now();
    const name = `A11y series ${String(now)}-${String(Math.floor(Math.random() * 1e6))}`;
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const headers = { authorization: `Bearer ${((await login.json()) as { accessToken: string }).accessToken}` };
    const series = await request.post("/api/series", {
        headers,
        data: { name, minValue: -40, maxValue: 45, color: "#d9480f", icon: "triangle", unit: "°C" },
    });
    const { id } = (await series.json()) as { id: number };
    const sensor = await request.post("/api/sensors", { headers, data: { name: `${name} sensor`, seriesId: id } });
    const { apiKey } = (await sensor.json()) as { apiKey: string };
    for (let i = 0; i < POINTS; i++) {
        const timestamp = new Date(now - (POINTS - i) * HOUR_MS).toISOString();
        const posted = await request.post("/api/measurements", { headers: { "x-api-key": apiKey }, data: { value: i + 1, timestamp } });
        expect(posted.ok()).toBe(true);
    }
    return name;
}

async function openDataTab(page: Page, name: string): Promise<void> {
    await page.goto("/");
    await expect(page.getByRole("img", { name: new RegExp(name) })).toBeVisible();
    await expect(page.locator(".data-row").first()).toBeVisible();
}

for (const scheme of SCHEMES) {
    test.describe(`${scheme} colour scheme`, () => {
        test.beforeEach(async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });
        });

        test("Data tab with charts, table and a selected row", async ({ page, request }) => {
            const name = await seed(request);
            await openDataTab(page, name);
            await page.locator(".data-row").nth(1).click();
            await expect(page.locator(".selected-point").first()).toBeVisible();
            await expectNoAccessibilityViolations(page);
        });

        test("Data tab at 360 px", async ({ page, request }) => {
            const name = await seed(request);
            await page.setViewportSize({ width: 360, height: 800 });
            await openDataTab(page, name);
            await expectNoAccessibilityViolations(page);
        });

        test("login dialog", async ({ page }) => {
            await page.goto("/");
            await page.getByRole("button", { name: "Log in", exact: true }).click();
            await expect(page.getByRole("dialog")).toBeVisible();
            await expectNoAccessibilityViolations(page);
        });

        test("admin screens and their dialogs", async ({ page, request }) => {
            const name = await seed(request);
            await logIn(page);

            await page.getByRole("tab", { name: "Series", exact: true }).click();
            await expect(page.getByRole("row").filter({ hasText: name })).toBeVisible();
            await expectNoAccessibilityViolations(page);

            await page.getByRole("button", { name: "New series", exact: true }).click();
            await expect(page.getByRole("dialog", { name: "New series", exact: true })).toBeVisible();
            await expectNoAccessibilityViolations(page);
            await page.keyboard.press("Escape");
            await expect(page.getByRole("dialog")).toBeHidden();

            await page.getByRole("tab", { name: "Sensors", exact: true }).click();
            await expect(page.getByRole("row").filter({ hasText: `${name} sensor` })).toBeVisible();
            await expectNoAccessibilityViolations(page);

            await page.getByRole("button", { name: "Register a sensor", exact: true }).click();
            const form = page.getByRole("dialog", { name: "Register a sensor", exact: true });
            await expect(form).toBeVisible();
            await expectNoAccessibilityViolations(page);

            await form.getByLabel("Sensor name", { exact: true }).fill(`${name} second`);
            await form.getByLabel("Series", { exact: true }).click();
            await page.getByRole("option", { name, exact: true }).click();
            await form.getByLabel("Sensor name", { exact: true }).press("Enter");
            const keyDialog = page.getByRole("dialog", { name: "Sensor registered", exact: true });
            await expect(keyDialog).toBeVisible();
            // The form fades out while the key dialog opens; axe should see one dialog.
            await expect(form).toBeHidden();
            await expectNoAccessibilityViolations(page);
            await keyDialog.getByRole("button", { name: "Done", exact: true }).click();
            await expect(keyDialog).toBeHidden();

            await page.getByRole("tab", { name: "Account", exact: true }).click();
            await expect(page.getByRole("tab", { name: "Account", exact: true })).toHaveAttribute("aria-selected", "true");
            await expectNoAccessibilityViolations(page);
        });
    });
}

test("the Series and Sensors tabs do not scroll sideways at 360 px", async ({ page, request }) => {
    const name = await seed(request);
    await page.setViewportSize({ width: 360, height: 740 });
    await logIn(page);
    for (const [tab, row] of [
        ["Series", name],
        ["Sensors", `${name} sensor`],
    ] as const) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await expect(page.getByRole("row").filter({ hasText: row })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${tab} tab`).toBeLessThanOrEqual(0);
    }
});
