import { useEffect, useState } from "react";

import { listMeasurements, listSeries, type Measurement, type Series } from "./api";
import { mergeLive, openLive } from "./live";
import { requestRange } from "./range";

type Remote<T> = { status: "loading" } | { status: "error"; error: Error } | { status: "ready"; value: T };

/** What a load left in state: tagged with the request it answers, so an older answer is never shown. */
type Loaded<T> = { key: string; value: T } | { key: string; error: Error };

function toRemote<T>(loaded: Loaded<T> | null, key: string | null): Remote<T> {
    if (loaded?.key !== key) return { status: "loading" };
    return "error" in loaded ? { status: "error", error: loaded.error } : { status: "ready", value: loaded.value };
}

const asError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

export interface RequestedRange {
    fromMs: number;
    toMs: number;
    /** The range runs up to now: ask without an end and follow the live stream. */
    live: boolean;
}

export interface DashboardData {
    series: Remote<Series[]>;
    /** `loading` also while there is no valid range or no series yet. */
    measurements: Remote<readonly Measurement[]>;
    liveConnected: boolean;
    retry: () => void;
}

/** Loads the series and the measurements of the range, and keeps a live range up to date. */
export function useDashboardData(range: RequestedRange | null): DashboardData {
    const [attempt, setAttempt] = useState(0);
    const [seriesLoaded, setSeriesLoaded] = useState<Loaded<Series[]> | null>(null);
    const [measurementsLoaded, setMeasurementsLoaded] = useState<Loaded<readonly Measurement[]> | null>(null);
    const [liveConnected, setLiveConnected] = useState(false);

    const seriesKey = `series:${attempt}`;
    useEffect(() => {
        const controller = new AbortController();
        listSeries(controller.signal).then(
            (value) => {
                setSeriesLoaded({ key: seriesKey, value });
            },
            (e: unknown) => {
                if (!controller.signal.aborted) setSeriesLoaded({ key: seriesKey, error: asError(e) });
            },
        );
        return () => {
            controller.abort();
        };
    }, [seriesKey]);

    const series = toRemote(seriesLoaded, seriesKey);
    const idsKey = series.status === "ready" ? series.value.map((s) => s.id).join(",") : null;
    const fromMs = range?.fromMs ?? null;
    const toMs = range?.toMs ?? null;
    const live = range?.live ?? false;
    const measurementsKey = idsKey === null || fromMs === null || toMs === null ? null : `m:${idsKey}:${fromMs}:${toMs}:${live}:${attempt}`;

    useEffect(() => {
        if (measurementsKey === null || idsKey === null || fromMs === null || toMs === null) return;
        const controller = new AbortController();
        const { from, to } = requestRange(fromMs, toMs, live);
        const seriesIds = idsKey === "" ? [] : idsKey.split(",").map(Number);
        listMeasurements({ seriesIds, from, to }, controller.signal).then(
            (value) => {
                setMeasurementsLoaded({ key: measurementsKey, value });
            },
            (e: unknown) => {
                if (!controller.signal.aborted) setMeasurementsLoaded({ key: measurementsKey, error: asError(e) });
            },
        );
        return () => {
            controller.abort();
        };
    }, [measurementsKey, idsKey, fromMs, toMs, live]);

    useEffect(() => {
        if (!live || measurementsKey === null || idsKey === null || idsKey === "" || fromMs === null) return;
        const close = openLive(idsKey.split(",").map(Number), {
            onMeasurement: (incoming) => {
                setMeasurementsLoaded((previous) => {
                    if (previous?.key !== measurementsKey || "error" in previous) return previous;
                    const value = mergeLive(previous.value, incoming, fromMs, null);
                    return value === previous.value ? previous : { key: measurementsKey, value };
                });
            },
            onOpen: () => {
                setLiveConnected(true);
            },
            onError: () => {
                setLiveConnected(false);
            },
        });
        return () => {
            close();
            setLiveConnected(false);
        };
    }, [live, measurementsKey, idsKey, fromMs]);

    return {
        series,
        measurements: toRemote(measurementsLoaded, measurementsKey),
        liveConnected,
        retry: () => {
            setAttempt((n) => n + 1);
        },
    };
}
