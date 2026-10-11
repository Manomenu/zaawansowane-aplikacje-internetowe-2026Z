import { afterEach, describe, expect, it, vi } from "vitest";

import { listMeasurements } from "./api";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("listMeasurements", () => {
    it("asks nothing when there are no series", async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
        await expect(listMeasurements({ seriesIds: [], from: "2026-07-13T10:46:00.000Z" }, new AbortController().signal)).resolves.toEqual(
            [],
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("sends the series as a comma-separated list", async () => {
        const fetchSpy = vi.fn(() => Promise.resolve(new Response("[]", { status: 200, headers: { "content-type": "application/json" } })));
        vi.stubGlobal("fetch", fetchSpy);
        await listMeasurements({ seriesIds: [1, 3], from: "2026-07-13T10:46:00.000Z" }, new AbortController().signal);
        const url = new URL(String((fetchSpy.mock.calls[0] as unknown[])[0]), "http://localhost");
        expect(url.searchParams.get("series")).toBe("1,3");
    });
});
