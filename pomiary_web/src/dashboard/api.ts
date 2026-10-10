// This feature's HTTP calls, typed from the generated OpenAPI types.
import { request } from "../api/client";
import type { components } from "../api/openapi";

export type Series = components["schemas"]["Series"];
export type Measurement = components["schemas"]["Measurement"];

/** The server's largest page. The newest come first (`sort=-timestamp`), so a range holding more loses its oldest part. */
export const MEASUREMENTS_LIMIT = 10_000;

export function listSeries(signal: AbortSignal): Promise<Series[]> {
    return request<Series[]>("/series", { signal });
}

export interface MeasurementsQuery {
    seriesIds: readonly number[];
    /** ISO 8601. */
    from: string;
    /** ISO 8601; left out for a range that runs up to now. */
    to?: string | undefined;
}

export function listMeasurements(query: MeasurementsQuery, signal: AbortSignal): Promise<Measurement[]> {
    const params = new URLSearchParams({
        series: query.seriesIds.join(","),
        from: query.from,
        sort: "-timestamp",
        limit: String(MEASUREMENTS_LIMIT),
    });
    if (query.to !== undefined) params.set("to", query.to);
    return request<Measurement[]>(`/measurements?${params.toString()}`, { signal });
}
