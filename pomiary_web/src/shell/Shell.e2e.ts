import { expect, test } from "@playwright/test";

import { logIn } from "../../e2e/helpers";

test.use({ viewport: { width: 360, height: 740 } });

test("at 360 px the page does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    await logIn(page);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("the page has its landmarks and the attribution", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Forest conditions", exact: true })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections", exact: true })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Open-Meteo.com", exact: true })).toBeVisible();
});

test("printing hides the header, the tabs and the footer", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Sections", exact: true })).toBeHidden();
    await expect(page.getByRole("contentinfo")).toBeHidden();
    await expect(page.getByRole("main")).toBeVisible();
});
