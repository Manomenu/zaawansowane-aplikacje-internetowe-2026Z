// This feature's HTTP calls, typed from the generated OpenAPI types.
import { request } from "../api/client";
import type { components } from "../api/openapi";

export type Series = components["schemas"]["Series"];
export type SeriesInput = components["schemas"]["SeriesInput"];

export function listSeries(signal?: AbortSignal): Promise<Series[]> {
    return request<Series[]>("/series", { signal });
}

export function createSeries(token: string, input: SeriesInput): Promise<Series> {
    return request<Series>("/series", { method: "POST", token, body: input });
}

export function updateSeries(token: string, id: number, input: SeriesInput): Promise<Series> {
    return request<Series>(`/series/${String(id)}`, { method: "PUT", token, body: input });
}

export function deleteSeries(token: string, id: number): Promise<void> {
    return request<undefined>(`/series/${String(id)}`, { method: "DELETE", token });
}
