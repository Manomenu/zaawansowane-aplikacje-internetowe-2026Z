import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { ADMIN_PASSWORD, ADMIN_USERNAME, logIn } from "../../e2e/helpers";

/** A name no other test uses, so tests do not depend on each other. */
function uniqueName(label: string): string {
    return `${label} ${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
}

async function adminToken(request: APIRequestContext): Promise<string> {
    const response = await request.post("/api/auth/login", { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    expect(response.ok()).toBe(true);
    return ((await response.json()) as { accessToken: string }).accessToken;
}

async function createSeriesViaApi(request: APIRequestContext, token: string, name: string): Promise<number> {
    const response = await request.post("/api/series", {
        headers: { authorization: `Bearer ${token}` },
        data: { name, minValue: 0, maxValue: 100, color: "#2f9e44", icon: "square", unit: "%" },
    });
    expect(response.status()).toBe(201);
    return ((await response.json()) as { id: number }).id;
}

async function openSeriesTab(page: Page): Promise<void> {
    await logIn(page);
    await page.getByRole("tab", { name: "Series", exact: true }).click();
}

test("creating a series through the form puts it in the table with its colour and marker", async ({ page }) => {
    const name = uniqueName("Created");
    await openSeriesTab(page);

    await page.getByRole("button", { name: "New series", exact: true }).click();
    const dialog = page.getByRole("dialog");
    // Focus moves into the dialog.
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    await dialog.getByRole("textbox", { name: "Unit", exact: true }).fill("°C");
    await dialog.getByRole("textbox", { name: "Minimum", exact: true }).fill("-10");
    await dialog.getByRole("textbox", { name: "Maximum", exact: true }).fill("40");
    await dialog.getByRole("textbox", { name: "Colour", exact: true }).fill("#e8590c");
    // Leaving the field closes the colour picker, which would cover the next one.
    await dialog.getByRole("textbox", { name: "Colour", exact: true }).press("Tab");
    await dialog.getByRole("combobox", { name: "Marker shape", exact: true }).click();
    await page.getByRole("option", { name: "triangle", exact: true }).click();
    // Enter in a field submits the form.
    await dialog.getByRole("textbox", { name: "Maximum", exact: true }).press("Enter");

    await expect(dialog).toBeHidden();
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row.getByRole("cell", { name: "°C", exact: true })).toBeVisible();
    await expect(row.getByText("-10 – 40", { exact: true })).toBeVisible();
    await expect(row.getByText("#e8590c", { exact: true })).toBeVisible();
    await expect(row.getByRole("img", { name: "Marker: triangle", exact: true })).toBeVisible();
    await expect(row.getByText("triangle", { exact: true })).toBeVisible();
    // Focus returns to where it was.
    await expect(page.getByRole("button", { name: "New series", exact: true })).toBeFocused();
});

test("a minimum that is not below the maximum is refused in the browser, nothing is sent", async ({ page }) => {
    await openSeriesTab(page);
    const sent: string[] = [];
    page.on("request", (request) => {
        if (request.method() === "POST" && request.url().includes("/api/series")) sent.push(request.url());
    });

    await page.getByRole("button", { name: "New series", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(uniqueName("Invalid"));
    await dialog.getByRole("textbox", { name: "Minimum", exact: true }).fill("5");
    await dialog.getByRole("textbox", { name: "Maximum", exact: true }).fill("5");
    await dialog.getByRole("button", { name: "Create series", exact: true }).click();

    await expect(dialog.getByText("The maximum must be greater than the minimum.", { exact: true })).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(sent).toEqual([]);
});

test("editing a series changes its name in the table", async ({ page, request }) => {
    const name = uniqueName("Before");
    const renamed = uniqueName("After");
    await createSeriesViaApi(request, await adminToken(request), name);
    await openSeriesTab(page);

    await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(name);
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(renamed);
    await dialog.getByRole("button", { name: "Save series", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("cell", { name: renamed, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name, exact: true })).toHaveCount(0);
});

test("narrowing the range below a stored measurement shows the conflict under the range", async ({ page, request }) => {
    const name = uniqueName("Conflict");
    const token = await adminToken(request);
    const seriesId = await createSeriesViaApi(request, token, name);
    const sensor = await request.post("/api/sensors", {
        headers: { authorization: `Bearer ${token}` },
        data: { name: uniqueName("Sensor"), seriesId },
    });
    expect(sensor.status()).toBe(201);
    const { apiKey } = (await sensor.json()) as { apiKey: string };
    const measurement = await request.post("/api/measurements", { headers: { "x-api-key": apiKey }, data: { value: 80 } });
    expect(measurement.status()).toBe(201);
    await openSeriesTab(page);

    await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Maximum", exact: true }).fill("10");
    await dialog.getByRole("button", { name: "Save series", exact: true }).click();

    // The server's sentence is under both range fields; the dialog stays open.
    await expect(dialog.getByText(/measurement/i)).toHaveCount(2);
    await expect(dialog).toBeVisible();
    // The stored range is unchanged.
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: name }).getByText("0 – 100", { exact: true })).toBeVisible();
});

test("deleting asks first, says what goes with the series, and removes it", async ({ page, request }) => {
    const name = uniqueName("Doomed");
    await createSeriesViaApi(request, await adminToken(request), name);
    await openSeriesTab(page);

    await page.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/measurements and its sensors are deleted/)).toBeVisible();
    // Cancelling keeps it.
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete series", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("cell", { name, exact: true })).toHaveCount(0);
});
