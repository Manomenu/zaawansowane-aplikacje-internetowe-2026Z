// This feature's HTTP calls, typed from the generated OpenAPI types.
import { request } from "../api/client";
import type { components } from "../api/openapi";

export type Sensor = components["schemas"]["Sensor"];
export type SensorCreated = components["schemas"]["SensorCreated"];
export type SensorInput = components["schemas"]["SensorInput"];
export type Series = components["schemas"]["Series"];

export function listSensors(token: string, signal: AbortSignal): Promise<Sensor[]> {
    return request<Sensor[]>("/sensors", { token, signal });
}

/** The series are read here for the select and for the names in the table (series/ is a feature of its own). */
export function listSeries(signal: AbortSignal): Promise<Series[]> {
    return request<Series[]>("/series", { signal });
}

/** The answer carries the sensor's key: the only time the server ever sends it. */
export function registerSensor(token: string, input: SensorInput): Promise<SensorCreated> {
    return request<SensorCreated>("/sensors", { method: "POST", token, body: input });
}

export function unregisterSensor(token: string, id: number): Promise<void> {
    return request<undefined>(`/sensors/${id}`, { method: "DELETE", token });
}
