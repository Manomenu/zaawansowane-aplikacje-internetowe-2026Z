import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, NETWORK_ERROR_STATUS, request, toError } from "./client";

function respondWith(response: Response) {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("toError", () => {
    it("carries the server's detail", async () => {
        const response = new Response(JSON.stringify({ detail: "not found" }), { status: 404 });

        const error = await toError(response);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBe("not found");
        expect(error.status).toBe(404);
        expect(error.fieldErrors).toEqual({});
    });

    it("falls back to the status when the body says nothing", async () => {
        const response = new Response("oops", { status: 502, statusText: "Bad Gateway" });

        expect((await toError(response)).message).toBe("502 Bad Gateway");
    });

    it("maps a Problem's errors onto fields, the first message per field", async () => {
        const body = {
            detail: "Validation failed",
            errors: [
                { field: "name", message: "too short" },
                { field: "name", message: "second" },
                { field: "maxValue", message: "must be above minValue" },
                { nonsense: true },
            ],
        };

        const error = await toError(new Response(JSON.stringify(body), { status: 422 }));

        expect(error.detail).toBe("Validation failed");
        expect(error.fieldErrors).toEqual({ name: "too short", maxValue: "must be above minValue" });
    });
});

describe("request", () => {
    it("sends JSON with the Bearer token and parses the answer", async () => {
        const fetchMock = respondWith(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

        const result = await request<{ ok: number }>("/things", { method: "POST", body: { a: 1 }, token: "abc" });

        expect(result).toEqual({ ok: 1 });
        const [url, init] = fetchMock.mock.calls[0] ?? [];
        expect(url).toBe("/api/things");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe('{"a":1}');
        expect(init?.headers).toEqual({ "content-type": "application/json", authorization: "Bearer abc" });
    });

    it("sends no content type, body or token header when there are none", async () => {
        const fetchMock = respondWith(new Response("{}", { status: 200 }));

        await request("/things");

        const [, init] = fetchMock.mock.calls[0] ?? [];
        expect(init?.method).toBe("GET");
        expect(init?.headers).toEqual({});
        expect(init?.body).toBeNull();
    });

    it("returns undefined for 204", async () => {
        respondWith(new Response(null, { status: 204 }));

        expect(await request("/things", { method: "DELETE" })).toBeUndefined();
    });

    it("throws an ApiError for a failed response", async () => {
        respondWith(new Response(JSON.stringify({ detail: "Invalid token" }), { status: 401 }));

        await expect(request("/things")).rejects.toMatchObject({ status: 401, detail: "Invalid token" });
    });

    it("turns a network failure into an ApiError with status 0", async () => {
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")));

        const error = await request("/things").catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: NETWORK_ERROR_STATUS });
        expect((error as ApiError).message).toContain("cannot be reached");
    });

    it("lets an abort through untouched", async () => {
        const controller = new AbortController();
        controller.abort();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new DOMException("aborted", "AbortError")));

        const error = await request("/things", { signal: controller.signal }).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(DOMException);
    });
});
