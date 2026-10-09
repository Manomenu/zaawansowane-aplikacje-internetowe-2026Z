// The time range the filters describe (F5): presets, the `datetime-local` text, validation.

export type Preset = "24h" | "7d" | "30d";

export const PRESETS: readonly { value: Preset; label: string; hours: number }[] = [
    { value: "24h", label: "24 h", hours: 24 },
    { value: "7d", label: "7 days", hours: 7 * 24 },
    { value: "30d", label: "30 days", hours: 30 * 24 },
];

export const DEFAULT_PRESET: Preset = "7d";

/** A range whose end is at most this far in the past still counts as "up to now". */
export const LIVE_GRACE_MS = 5 * 60_000;

const MINUTE_MS = 60_000;

/** What the two inputs hold, which preset (if any) they came from, and whether the range follows "now". */
export interface Filters {
    /** `YYYY-MM-DDTHH:mm`, local time. */
    from: string;
    to: string;
    preset: Preset | null;
    live: boolean;
}

const INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const pad = (n: number): string => String(n).padStart(2, "0");

/** The value of a `datetime-local` input for a moment, in local time. */
export function toInputValue(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The moment an input value names, or null while the input is empty or incomplete. */
export function parseInputValue(value: string): number | null {
    if (!INPUT_PATTERN.test(value)) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
}

export function presetFilters(preset: Preset, now: Date): Filters {
    const hours = PRESETS.find((p) => p.value === preset)?.hours ?? 0;
    return {
        from: toInputValue(new Date(now.getTime() - hours * 3_600_000)),
        to: toInputValue(now),
        preset,
        live: true,
    };
}

/** The filters after the user typed into one of the inputs: no preset any more. */
export function editedFilters(previous: Filters, field: "from" | "to", value: string, now: Date): Filters {
    const next = { ...previous, [field]: value, preset: null };
    const toMs = parseInputValue(next.to);
    return { ...next, live: toMs !== null && now.getTime() - toMs <= LIVE_GRACE_MS };
}

export type RangeCheck = { ok: true; fromMs: number; toMs: number } | { ok: false; message: string };

export function validateRange(filters: Filters): RangeCheck {
    const fromMs = parseInputValue(filters.from);
    const toMs = parseInputValue(filters.to);
    if (fromMs === null) return { ok: false, message: "Enter the start of the range." };
    if (toMs === null) return { ok: false, message: "Enter the end of the range." };
    if (fromMs > toMs) return { ok: false, message: "The start must not be after the end." };
    return { ok: true, fromMs, toMs };
}

/** What the server is asked for: a live range has no end, a fixed one ends with its last minute. */
export function requestRange(fromMs: number, toMs: number, live: boolean): { from: string; to: string | undefined } {
    return {
        from: new Date(fromMs).toISOString(),
        to: live ? undefined : new Date(toMs + MINUTE_MS - 1).toISOString(),
    };
}

/** The range in words, for the heading and the charts' descriptions. */
export function describeRange(fromMs: number, toMs: number, locale?: string): string {
    const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
    return `${format.format(fromMs)} – ${format.format(toMs)}`;
}
