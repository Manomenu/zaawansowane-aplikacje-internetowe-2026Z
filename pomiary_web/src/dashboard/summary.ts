// The one-line state of the filters, next to the "Show/Hide filters" button (F5, F7).
import { PRESETS, type Filters } from "./range";

/** "Last 7 days · 12 of 12 series"; a hand-typed range is "Custom range". */
export function filterSummary(filters: Filters, shown: number, total: number): string {
    const preset = PRESETS.find((p) => p.value === filters.preset);
    const range = preset ? `Last ${preset.label}` : "Custom range";
    return `${range} · ${String(shown)} of ${String(total)} series`;
}
