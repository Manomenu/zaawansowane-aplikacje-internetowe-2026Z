import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { ADMIN_PASSWORD, ADMIN_USERNAME } from "../../e2e/helpers";

const HOUR_MS = 3_600_000;
const POINTS = 6;

interface Seeded {
    temperature: string;
    rain: string;
}

/** Creates two series with different units, a sensor each, and a few measurements through the API. */
async function seed(request: APIRequestContext): Promise<Seeded> {
    const now = Date.now();
    const suffix = String(now);
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const token = ((await login.json()) as { accessToken: string }).accessToken;
    const headers = { authorization: `Bearer ${token}` };

    const names: Seeded = { temperature: `Dash temperature ${suffix}`, rain: `Dash rain ${suffix}` };
    const definitions = [
        { name: names.temperature, minValue: -40, maxValue: 45, color: "#d9480f", icon: "triangle", unit: "°C" },
        { name: names.rain, minValue: 0, maxValue: 100, color: "#1971c2", icon: "square", unit: "mm" },
    ];
    for (const definition of definitions) {
        const series = await request.post("/api/series", { headers, data: definition });
        const { id } = (await series.json()) as { id: number };
        const sensor = await request.post("/api/sensors", { headers, data: { name: `${definition.name} sensor`, seriesId: id } });
        const { apiKey } = (await sensor.json()) as { apiKey: string };
        for (let i = 0; i < POINTS; i++) {
            // A rain value only every second hour, so the rows do not all fill every column.
            if (definition.unit === "mm" && i % 2 === 1) continue;
            const timestamp = new Date(now - (POINTS - i) * HOUR_MS).toISOString();
            const posted = await request.post("/api/measurements", {
                headers: { "x-api-key": apiKey },
                data: { value: i + 1, timestamp },
            });
            expect(posted.ok()).toBe(true);
        }
    }
    return names;
}

async function openDashboard(page: Page, names: Seeded): Promise<void> {
    await page.goto("/");
    await expect(page.getByRole("img", { name: new RegExp(names.temperature) })).toBeVisible();
}

test("charts and the table show the data; unchecking a series removes its column", async ({ page, request }) => {
    const names = await seed(request);
    await openDashboard(page, names);

    await expect(page.getByRole("img", { name: new RegExp(names.rain) })).toBeVisible();
    const table = page.getByRole("region", { name: "Measurements table", exact: true });
    await expect(table.getByRole("columnheader", { name: new RegExp(names.temperature) })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: new RegExp(names.rain) })).toBeVisible();

    await page.getByRole("checkbox", { name: names.rain, exact: true }).uncheck();

    await expect(table.getByRole("columnheader", { name: new RegExp(names.rain) })).toHaveCount(0);
    await expect(page.getByRole("img", { name: new RegExp(names.rain) })).toHaveCount(0);
    await expect(page.getByRole("img", { name: new RegExp(names.temperature) })).toBeVisible();
});

test("selecting a row highlights its points on the chart, by click and by keyboard", async ({ page, request }) => {
    const names = await seed(request);
    await openDashboard(page, names);
    const rows = page.locator(".data-row");
    await expect(page.locator(".selected-point")).toHaveCount(0);

    await rows.nth(1).click();
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".selected-point").first()).toBeVisible();
    await expect(page.locator(".selected-line line").first()).toBeAttached();

    await rows.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
});

test("a preset changes the range and a reversed range is refused without a request", async ({ page, request }) => {
    const names = await seed(request);
    await openDashboard(page, names);
    const from = page.getByLabel("From", { exact: true });
    const before = await from.inputValue();

    await page.getByRole("button", { name: "24 h", exact: true }).click();
    await expect(page.getByRole("button", { name: "24 h", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(from).not.toHaveValue(before);

    const measurementRequests: string[] = [];
    page.on("request", (r) => {
        if (r.url().includes("/api/measurements?")) measurementRequests.push(r.url());
    });
    await from.fill("2999-01-01T00:00");
    await expect(page.getByText("The start must not be after the end.", { exact: true })).toBeVisible();
    expect(measurementRequests).toEqual([]);
});

test("at 360 px the page does not scroll sideways", async ({ page, request }) => {
    const names = await seed(request);
    await page.setViewportSize({ width: 360, height: 800 });
    await openDashboard(page, names);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});

test("printing hides the controls and keeps the charts and the table", async ({ page, request }) => {
    const names = await seed(request);
    await openDashboard(page, names);

    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("button", { name: "24 h", exact: true })).toBeHidden();
    await expect(page.getByLabel("From", { exact: true })).toBeHidden();
    await expect(page.getByText(/^Range: /)).toBeVisible();
    await expect(page.getByRole("img", { name: new RegExp(names.temperature) })).toBeVisible();
    await expect(page.getByRole("region", { name: "Measurements table", exact: true })).toBeVisible();
});

test("a measurement a sensor sends appears without reloading (live stream)", async ({ page, request }) => {
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const headers = { authorization: `Bearer ${((await login.json()) as { accessToken: string }).accessToken}` };
    const name = `Live ${String(Date.now())}`;
    const series = await request.post("/api/series", {
        headers,
        data: { name, minValue: 0, maxValue: 100, color: "#2f9e44", icon: "diamond", unit: "%" },
    });
    const { id } = (await series.json()) as { id: number };
    const sensor = await request.post("/api/sensors", { headers, data: { name: `${name} sensor`, seriesId: id } });
    const { apiKey } = (await sensor.json()) as { apiKey: string };
    const send = (value: number) => request.post("/api/measurements", { headers: { "x-api-key": apiKey }, data: { value } });
    expect((await send(11)).ok()).toBe(true);

    await page.goto("/");
    await expect(page.getByRole("img", { name: new RegExp(name) })).toBeVisible();
    await expect(page.getByText("Live: new measurements appear as they arrive.", { exact: true })).toBeVisible();
    const table = page.getByRole("region", { name: "Measurements table", exact: true });
    await expect(table.getByRole("cell", { name: "73", exact: true })).toHaveCount(0);

    expect((await send(73)).ok()).toBe(true);

    await expect(table.getByRole("cell", { name: "73", exact: true })).toBeVisible();
});
