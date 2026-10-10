// Series grouped by unit, and which of them are shown (F5). Hidden ids are what the user
// unchecked, so a series that arrives later is visible by default.
import type { Series } from "./api";

export interface UnitGroup {
    /** The unit as stored; "" for a series without one. */
    unit: string;
    /** The unit as shown. */
    label: string;
    series: Series[];
}

export const NO_UNIT_LABEL = "no unit";

/** One group per unit, in the order the units first appear. */
export function groupByUnit(series: readonly Series[]): UnitGroup[] {
    const groups = new Map<string, UnitGroup>();
    for (const s of series) {
        const unit = s.unit ?? "";
        const group = groups.get(unit) ?? { unit, label: unit === "" ? NO_UNIT_LABEL : unit, series: [] };
        group.series.push(s);
        groups.set(unit, group);
    }
    return [...groups.values()];
}

export function visibleSeries(series: readonly Series[], hidden: ReadonlySet<number>): Series[] {
    return series.filter((s) => !hidden.has(s.id));
}

/** Newest series first (the highest id): the ones just added are the first columns and legend entries. */
export function newestFirst(series: readonly Series[]): Series[] {
    return [...series].sort((a, b) => b.id - a.id);
}

export function toggleSeries(hidden: ReadonlySet<number>, id: number): Set<number> {
    const next = new Set(hidden);
    if (!next.delete(id)) next.add(id);
    return next;
}

export type UnitState = "all" | "some" | "none";

export function unitState(group: UnitGroup, hidden: ReadonlySet<number>): UnitState {
    const shown = group.series.filter((s) => !hidden.has(s.id)).length;
    if (shown === 0) return "none";
    return shown === group.series.length ? "all" : "some";
}

/** "All of this unit": hides the whole group, unless it is entirely visible already. */
export function toggleUnit(hidden: ReadonlySet<number>, group: UnitGroup): Set<number> {
    const next = new Set(hidden);
    const show = unitState(group, hidden) !== "all";
    for (const s of group.series) {
        if (show) next.delete(s.id);
        else next.add(s.id);
    }
    return next;
}
