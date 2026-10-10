import { expect, test, type APIRequestContext } from "@playwright/test";

import { ADMIN_PASSWORD, ADMIN_USERNAME, logIn } from "../../e2e/helpers";

/** Creates a series through the API as the administrator; returns its id. */
async function createSeries(request: APIRequestContext, name: string): Promise<number> {
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const { accessToken } = (await login.json()) as { accessToken: string };
    const response = await request.post("/api/series", {
        headers: { authorization: `Bearer ${accessToken}` },
        data: { name, minValue: 0, maxValue: 100, color: "#1971c2" },
    });
    expect(response.status()).toBe(201);
    return ((await response.json()) as { id: number }).id;
}

test("registering shows the key once, the key works, and unregistering stops it", async ({ page, request }) => {
    const suffix = Date.now().toString();
    const seriesName = `E2E series ${suffix}`;
    const sensorName = `E2E sensor ${suffix}`;
    await createSeries(request, seriesName);
    await logIn(page);
    await page.getByRole("tab", { name: "Sensors", exact: true }).click();

    // Checked in the browser, before anything is sent.
    await page.getByRole("button", { name: "Register a sensor", exact: true }).click();
    const form = page.getByRole("dialog", { name: "Register a sensor", exact: true });
    await form.getByRole("button", { name: "Register", exact: true }).click();
    await expect(form.getByText("Enter the sensor's name.", { exact: true })).toBeVisible();
    await expect(form.getByText("Choose the series the sensor measures.", { exact: true })).toBeVisible();

    // Enter in the name field submits the form.
    await form.getByLabel("Sensor name", { exact: true }).fill(sensorName);
    await form.getByLabel("Series", { exact: true }).click();
    await page.getByRole("option", { name: seriesName, exact: true }).click();
    await form.getByLabel("Sensor name", { exact: true }).press("Enter");

    const keyDialog = page.getByRole("dialog", { name: "Sensor registered", exact: true });
    await expect(keyDialog).toBeVisible();
    await expect(keyDialog.getByText("This key is shown only once.", { exact: false })).toBeVisible();
    const key = await keyDialog.getByLabel("API key", { exact: true }).inputValue();
    expect(key.length).toBeGreaterThanOrEqual(32);
    await expect(keyDialog.getByText(`--api-key ${key}`, { exact: false })).toBeVisible();

    // The key is a working sensor key.
    const sent = await request.post("/api/measurements", { headers: { "x-api-key": key }, data: { value: 42 } });
    expect(sent.status()).toBe(201);

    // Closing the dialog drops the key from the page.
    await keyDialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(keyDialog).toBeHidden();
    expect(await page.content()).not.toContain(key);

    // The list shows the sensor with its series and the measurement after a reload; the key is never there.
    await page.reload();
    await page.getByRole("tab", { name: "Sensors", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: sensorName });
    await expect(row.getByRole("cell").nth(1)).toHaveText(seriesName);
    await expect(row.getByRole("cell").nth(3)).not.toHaveText("never");
    expect(await page.content()).not.toContain(key);

    // Unregistering asks first; the key then stops working and the sensor is gone.
    await page.getByRole("button", { name: `Unregister ${sensorName}`, exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Unregister the sensor?", exact: true });
    await expect(confirm.getByText("stop working at once", { exact: false })).toBeVisible();
    await confirm.getByRole("button", { name: "Confirm unregister", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: sensorName })).toHaveCount(0);

    const refused = await request.post("/api/measurements", { headers: { "x-api-key": key }, data: { value: 43 } });
    expect(refused.status()).toBe(401);
});

test("at 360 px the table scrolls in its own box, not the page", async ({ page, request }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const suffix = Date.now().toString();
    const seriesId = await createSeries(request, `E2E narrow ${suffix}`);
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const { accessToken } = (await login.json()) as { accessToken: string };
    await request.post("/api/sensors", {
        headers: { authorization: `Bearer ${accessToken}` },
        data: { name: `E2E narrow sensor ${suffix}`, seriesId },
    });
    await logIn(page);
    await page.getByRole("tab", { name: "Sensors", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: `E2E narrow sensor ${suffix}` })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("a name another sensor has is refused in the browser, whatever its case", async ({ page, request }) => {
    const suffix = Date.now().toString();
    const seriesName = `E2E dup series ${suffix}`;
    const sensorName = `E2E dup sensor ${suffix}`;
    const seriesId = await createSeries(request, seriesName);
    const login = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    const { accessToken } = (await login.json()) as { accessToken: string };
    const created = await request.post("/api/sensors", {
        headers: { authorization: `Bearer ${accessToken}` },
        data: { name: sensorName, seriesId },
    });
    expect(created.status()).toBe(201);
    await logIn(page);
    await page.getByRole("tab", { name: "Sensors", exact: true }).click();
    const sent: string[] = [];
    page.on("request", (apiRequest) => {
        if (apiRequest.method() === "POST" && apiRequest.url().includes("/api/sensors")) sent.push(apiRequest.url());
    });

    await page.getByRole("button", { name: "Register a sensor", exact: true }).click();
    const form = page.getByRole("dialog", { name: "Register a sensor", exact: true });
    await form.getByLabel("Sensor name", { exact: true }).fill(sensorName.toUpperCase());
    await form.getByLabel("Series", { exact: true }).click();
    await page.getByRole("option", { name: seriesName, exact: true }).click();
    await form.getByRole("button", { name: "Register", exact: true }).click();

    await expect(form.getByText("A sensor with this name already exists", { exact: true })).toBeVisible();
    expect(sent).toEqual([]);
});
