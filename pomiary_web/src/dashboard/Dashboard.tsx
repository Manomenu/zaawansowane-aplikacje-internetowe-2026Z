import "./dashboard.css";

import { Button, Collapse, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

import { ErrorAlert } from "../shell/ErrorAlert";
import { Loading } from "../shell/Loading";
import { MEASUREMENTS_LIMIT } from "./api";
import { Filters } from "./Filters";
import { groupByUnit, newestFirst, toggleSeries, toggleUnit, visibleSeries, type UnitGroup } from "./grouping";
import { MeasurementTable } from "./MeasurementTable";
import { DEFAULT_PRESET, describeRange, editedFilters, presetFilters, validateRange, type Preset } from "./range";
import { filterSummary } from "./summary";
import { buildRows, capRows, chartPoints, limitNotice } from "./table";
import { UnitChart } from "./UnitChart";
import { useDashboardData } from "./useDashboardData";

const FILTERS_ID = "dashboard-filters";

/** The public Data tab: filters, one chart per unit, the table (F2, F5, F6, F7). */
export function Dashboard() {
    const [filters, setFilters] = useState(() => presetFilters(DEFAULT_PRESET, new Date()));
    const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());
    const [selectedMs, setSelectedMs] = useState<number | null>(null);

    const [filtersOpen, setFiltersOpen] = useState(true);

    const check = validateRange(filters);
    const data = useDashboardData(
        check.ok
            ? {
                  fromMs: check.fromMs,
                  toMs: check.toMs,
                  live: filters.live,
                  windowMs: filters.preset === null ? null : check.toMs - check.fromMs,
              }
            : null,
    );

    const changeRange = (next: typeof filters) => {
        setFilters(next);
        setSelectedMs(null);
    };

    const seriesList = data.series.status === "ready" ? data.series.value : [];
    const groups = groupByUnit(seriesList);
    // Newest first: the table columns, the legends and the chart lines all follow this order.
    const visible = newestFirst(visibleSeries(seriesList, hidden));

    return (
        <Stack gap="md">
            <Group justify="space-between" align="center" gap="sm">
                <Title order={2} size="h3">
                    Measurements
                </Title>
                <Group gap="sm" justify="flex-end">
                    <Text size="sm" className="filter-summary">
                        {filterSummary(filters, visible.length, seriesList.length)}
                    </Text>
                    <Button
                        variant="default"
                        className="no-print"
                        onClick={() => {
                            window.print();
                        }}
                    >
                        Print
                    </Button>
                    <Button
                        variant="default"
                        className="no-print"
                        aria-expanded={filtersOpen}
                        aria-controls={FILTERS_ID}
                        onClick={() => {
                            setFiltersOpen(!filtersOpen);
                        }}
                    >
                        {filtersOpen ? "Hide filters" : "Show filters"}
                    </Button>
                </Group>
            </Group>
            <Collapse expanded={filtersOpen} id={FILTERS_ID} className="no-print">
                <Filters
                    filters={filters}
                    rangeError={check.ok ? null : check.message}
                    groups={groups}
                    hidden={hidden}
                    onPreset={(preset: Preset) => {
                        changeRange(presetFilters(preset, new Date()));
                    }}
                    onEdit={(field, value) => {
                        changeRange(editedFilters(filters, field, value, new Date()));
                    }}
                    onToggleSeries={(id) => {
                        setHidden(toggleSeries(hidden, id));
                    }}
                    onToggleUnit={(group: UnitGroup) => {
                        setHidden(toggleUnit(hidden, group));
                    }}
                />
            </Collapse>
            {check.ok && <Text>Range: {describeRange(check.fromMs, check.toMs)}</Text>}
            {filters.live && check.ok && (
                <Text size="sm" className="no-print" role="status" aria-live="polite">
                    {data.liveConnected ? "Live: new measurements appear as they arrive." : ""}
                </Text>
            )}
            {data.series.status === "loading" && <Loading />}
            {data.series.status === "error" && <ErrorAlert error={data.series.error} onRetry={data.retry} />}
            {data.series.status === "ready" && !check.ok && <Text>Correct the time range to see the data.</Text>}
            {data.series.status === "ready" && check.ok && (
                <Content
                    measurements={data.measurements}
                    groups={groups}
                    visible={visible}
                    selectedMs={selectedMs}
                    onSelect={setSelectedMs}
                    rangeLabel={describeRange(check.fromMs, check.toMs)}
                    onRetry={data.retry}
                />
            )}
        </Stack>
    );
}

interface ContentProps {
    measurements: ReturnType<typeof useDashboardData>["measurements"];
    groups: readonly UnitGroup[];
    visible: ReturnType<typeof visibleSeries>;
    selectedMs: number | null;
    onSelect: (ms: number | null) => void;
    rangeLabel: string;
    onRetry: () => void;
}

function Content({ measurements, groups, visible, selectedMs, onSelect, rangeLabel, onRetry }: ContentProps) {
    if (visible.length === 0) return <Text>Select at least one series.</Text>;
    if (measurements.status === "loading") return <Loading />;
    if (measurements.status === "error") return <ErrorAlert error={measurements.error} onRetry={onRetry} />;

    const rows = buildRows(measurements.value, new Set(visible.map((s) => s.id)));
    const { shown, note } = capRows(rows);
    const notice = limitNotice(measurements.value.length, MEASUREMENTS_LIMIT);
    return (
        <>
            {notice !== null && (
                <Text size="sm" role="status">
                    {notice}
                </Text>
            )}
            {groups.map((group) => {
                const series = visible.filter((s) => (s.unit ?? "") === group.unit);
                if (series.length === 0) return null;
                return (
                    <UnitChart
                        key={group.unit}
                        unitLabel={group.label}
                        series={series}
                        points={chartPoints(
                            rows,
                            series.map((s) => s.id),
                        )}
                        selectedMs={selectedMs}
                        rangeLabel={rangeLabel}
                    />
                );
            })}
            <MeasurementTable rows={shown} note={note} series={visible} selectedMs={selectedMs} onSelect={onSelect} />
        </>
    );
}
