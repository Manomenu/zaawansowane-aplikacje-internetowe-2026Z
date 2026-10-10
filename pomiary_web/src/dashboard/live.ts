// Live updates (extension X1): the server pushes each new measurement as an SSE event.
import { BASE } from "../api/client";
import type { Measurement } from "./api";

const LIVE_EVENT = "measurement";

export function streamUrl(seriesIds: readonly number[]): string {
    return `${BASE}/measurements/stream?series=${seriesIds.join(",")}`;
}

/** A measurement from an event's data, or null when it is not one. */
export function parseMeasurement(data: string): Measurement | null {
    let value: unknown;
    try {
        value = JSON.parse(data);
    } catch {
        return null;
    }
    if (typeof value !== "object" || value === null) return null;
    const { id, seriesId, sensorId, value: v, timestamp } = value as Record<string, unknown>;
    if (typeof id !== "number" || typeof seriesId !== "number" || typeof v !== "number" || typeof timestamp !== "string") return null;
    if (Number.isNaN(new Date(timestamp).getTime())) return null;
    return { id, seriesId, sensorId: typeof sensorId === "number" ? sensorId : null, value: v, timestamp };
}

/**
 * The measurements with `incoming` added when it is inside the range (`toMs` null: no end) and not
 * there already. Returns the same array when nothing changed, so React does not re-render.
 */
export function mergeLive(
    existing: readonly Measurement[],
    incoming: Measurement,
    fromMs: number,
    toMs: number | null,
): readonly Measurement[] {
    const ms = new Date(incoming.timestamp).getTime();
    if (ms < fromMs || (toMs !== null && ms > toMs)) return existing;
    if (existing.some((m) => m.id === incoming.id)) return existing;
    return [incoming, ...existing];
}

/**
 * The measurements without those older than `windowMs` before `nowMs`: a preset's live window
 * slides as points arrive. Returns the same array when nothing left, so React does not re-render.
 */
export function slideWindow(existing: readonly Measurement[], nowMs: number, windowMs: number): readonly Measurement[] {
    const cutoff = nowMs - windowMs;
    const kept = existing.filter((m) => new Date(m.timestamp).getTime() >= cutoff);
    return kept.length === existing.length ? existing : kept;
}

export interface LiveHandlers {
    onMeasurement: (m: Measurement) => void;
    onOpen: () => void;
    onError: () => void;
}

/** Opens the stream; EventSource reconnects by itself. Returns the function that closes it. */
export function openLive(seriesIds: readonly number[], handlers: LiveHandlers): () => void {
    const source = new EventSource(streamUrl(seriesIds));
    source.addEventListener("open", handlers.onOpen);
    source.addEventListener("error", () => {
        // The endpoint may be missing or the connection lost: the dashboard works without it.
        console.debug("Live stream unavailable; the browser retries by itself.");
        handlers.onError();
    });
    source.addEventListener(LIVE_EVENT, (event) => {
        const measurement = parseMeasurement((event as MessageEvent<string>).data);
        if (measurement !== null) handlers.onMeasurement(measurement);
    });
    return () => {
        source.close();
    };
}
