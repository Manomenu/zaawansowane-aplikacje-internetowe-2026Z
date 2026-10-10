// The x-axis tick format follows how much time the chart spans (F5): seconds for minutes, hours for hours.

export type TickKind = "seconds" | "minutes" | "days";

/** Up to this span ticks show h:mm:ss; up to 6 h h:mm; beyond, date and h:mm. */
const SECONDS_MAX_SPAN_MS = 30 * 60_000;
const MINUTES_MAX_SPAN_MS = 6 * 3_600_000;

export function tickKind(spanMs: number): TickKind {
    if (spanMs <= SECONDS_MAX_SPAN_MS) return "seconds";
    if (spanMs <= MINUTES_MAX_SPAN_MS) return "minutes";
    return "days";
}

const OPTIONS: Record<TickKind, Intl.DateTimeFormatOptions> = {
    seconds: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
    minutes: { hour: "2-digit", minute: "2-digit" },
    days: { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
};

/** A single point gets this much room on each side, so the axis is not zero-width. */
export const SINGLE_POINT_PADDING_MS = 5 * 60_000;

/** The x-axis domain of a chart: the plotted data from its oldest to its newest point, never the selected range. */
export function dataDomain(firstMs: number, lastMs: number): [number, number] {
    if (firstMs === lastMs) return [firstMs - SINGLE_POINT_PADDING_MS, lastMs + SINGLE_POINT_PADDING_MS];
    return [Math.min(firstMs, lastMs), Math.max(firstMs, lastMs)];
}

/** A locale-aware formatter for the ticks of a chart spanning `spanMs`. */
export function tickFormatter(spanMs: number, locale?: string): (ms: number) => string {
    const format = new Intl.DateTimeFormat(locale, OPTIONS[tickKind(spanMs)]);
    return (ms) => format.format(ms);
}
