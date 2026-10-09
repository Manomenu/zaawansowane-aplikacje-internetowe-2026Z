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

const PLACES = ["Suwałki", "Białystok", "Olsztyn"];
const QUANTITIES = [
    { name: "Soil moisture", unit: "%", icon: "diamond", color: "#2f9e44" },
    { name: "Temperature", unit: "°C", icon: "triangle", color: "#d9480f" },
    { name: "Rainfall", unit: "mm", icon: "square", color: "#1971c2" },
    { name: "Humidity", unit: "%", icon: "circle", color: "#862e9c" },
];

/** The course's shape: 3 places x 4 quantities, each with one measurement a moment ago. Returns the series names. */
async function seedTwelve(request: APIRequestContext): Promise<string[]> {
    const suffix = String(Date.now()).slice(-6);
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const headers = { authorization: `Bearer ${((await login.json()) as { accessToken: string }).accessToken}` };
    const names: string[] = [];
    for (const place of PLACES) {
        for (const q of QUANTITIES) {
            const name = `${place}: ${q.name} ${suffix}`;
            const series = await request.post("/api/series", {
                headers,
                data: { name, minValue: -100, maxValue: 1000, color: q.color, icon: q.icon, unit: q.unit },
            });
            const { id } = (await series.json()) as { id: number };
            const sensor = await request.post("/api/sensors", { headers, data: { name: `${name} sensor`, seriesId: id } });
            const { apiKey } = (await sensor.json()) as { apiKey: string };
            const posted = await request.post("/api/measurements", {
                headers: { "x-api-key": apiKey },
                data: { value: 12.345, timestamp: new Date(Date.now() - HOUR_MS).toISOString() },
            });
            expect(posted.ok()).toBe(true);
            names.push(name);
        }
    }
    return names;
}

async function openDashboard(page: Page, names: Seeded): Promise<void> {
    await page.goto("/");
    await expect(page.getByRole("img", { name: new RegExp(names.temperature) })).toBeVisible();
}

test("the page is filters, then charts, then the table; the filters collapse and expand", async ({ page, request }) => {
    const names = await seed(request);
    await openDashboard(page, names);
    const hide = page.getByRole("button", { name: "Hide filters", exact: true });
    const show = page.getByRole("button", { name: "Show filters", exact: true });
    const preset = page.getByRole("button", { name: "24 h", exact: true });
    await expect(hide).toHaveAttribute("aria-expanded", "true");
    await expect(preset).toBeVisible();
    await expect(page.getByText(/^Last 7 days · \d+ of \d+ series$/)).toBeVisible();

    const filters = await page.getByRole("region", { name: "Filters", exact: true }).boundingBox();
    const chart = await page.getByRole("img", { name: new RegExp(names.temperature) }).boundingBox();
    const table = await page.getByRole("region", { name: "Measurements table", exact: true }).boundingBox();
    expect(filters && chart && table).toBeTruthy();
    expect((filters?.y ?? 0) + (filters?.height ?? 0)).toBeLessThanOrEqual(chart?.y ?? 0);
    expect((chart?.y ?? 0) + (chart?.height ?? 0)).toBeLessThanOrEqual(table?.y ?? 0);

    // The filters apply at once.
    await preset.click();
    await expect(page.getByText(/^Last 24 h · /)).toBeVisible();

    await hide.click();
    await expect(show).toHaveAttribute("aria-expanded", "false");
    await expect(preset).toBeHidden();
    await expect(page.getByRole("checkbox", { name: names.rain, exact: true })).toBeHidden();
    await expect(page.getByText(/^Last 24 h · \d+ of \d+ series$/)).toBeVisible();

    await show.click();
    await expect(hide).toHaveAttribute("aria-expanded", "true");
    await expect(preset).toBeVisible();
});

for (const size of [
    { width: 1280, height: 900 },
    { width: 1024, height: 800 },
]) {
    test(`at ${String(size.width)} px the table with 12 series fits without scrolling`, async ({ page, request }) => {
        const names = await seedTwelve(request);
        await page.setViewportSize(size);
        await page.goto("/");
        const table = page.getByRole("region", { name: "Measurements table", exact: true });
        for (const name of names) {
            await expect(table.getByRole("columnheader", { name: new RegExp(name) })).toBeVisible();
        }

        const box = await table.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
        expect(box.scroll).toBeLessThanOrEqual(box.client);
        const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(pageOverflow).toBeLessThanOrEqual(0);

        // Markers are readable: at least 16 px in the header.
        const marker = await table.locator("th .marker-icon").first().boundingBox();
        expect(marker?.width).toBeGreaterThanOrEqual(16);
        expect(marker?.height).toBeGreaterThanOrEqual(16);
        await page.screenshot({ path: `../.artifacts/dashboard-${String(size.width)}.png`, fullPage: true });
    });
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
    await expect(page.getByRole("button", { name: "Hide filters", exact: true })).toBeHidden();
    await expect(page.getByText(/^Range: /)).toBeVisible();
    await expect(page.getByText(/ · \d+ of \d+ series$/)).toBeVisible();
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
