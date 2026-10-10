import { Button, Checkbox, Fieldset, Group, Stack, Text, TextInput } from "@mantine/core";

import type { Series } from "./api";
import { unitState, type UnitGroup } from "./grouping";
import { MarkerIcon } from "./Marker";
import { markerShape } from "./markers";
import { PRESETS, type Filters as FilterValues, type Preset } from "./range";

interface Props {
    filters: FilterValues;
    /** Why the range cannot be used, or null. */
    rangeError: string | null;
    groups: readonly UnitGroup[];
    /** The series list arrived; until then an empty `groups` means "not known yet", not "none". */
    seriesLoaded: boolean;
    hidden: ReadonlySet<number>;
    onPreset: (preset: Preset) => void;
    onEdit: (field: "from" | "to", value: string) => void;
    onToggleSeries: (id: number) => void;
    onToggleUnit: (group: UnitGroup) => void;
}

function SeriesLabel({ series }: { series: Series }) {
    return (
        <Group gap={6} wrap="nowrap" component="span">
            <MarkerIcon shape={markerShape(series.icon)} color={series.color} />
            {series.name}
        </Group>
    );
}

/** The dashboard's controls (F5): the time range with presets, and the series by unit. */
export function Filters({ filters, rangeError, groups, seriesLoaded, hidden, onPreset, onEdit, onToggleSeries, onToggleUnit }: Props) {
    return (
        <section aria-label="Filters" className="no-print filters">
            <Fieldset legend="Time range">
                <Group gap="md" align="flex-end" className="filters-range">
                    <Group gap="xs" role="group" aria-label="Presets">
                        {PRESETS.map((preset) => (
                            <Button
                                key={preset.value}
                                size="xs"
                                variant={filters.preset === preset.value ? "filled" : "default"}
                                aria-pressed={filters.preset === preset.value}
                                onClick={() => {
                                    onPreset(preset.value);
                                }}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </Group>
                    <TextInput
                        type="datetime-local"
                        label="From"
                        value={filters.from}
                        error={rangeError}
                        onChange={(event) => {
                            onEdit("from", event.currentTarget.value);
                        }}
                    />
                    <TextInput
                        type="datetime-local"
                        label="To"
                        value={filters.to}
                        onChange={(event) => {
                            onEdit("to", event.currentTarget.value);
                        }}
                    />
                </Group>
            </Fieldset>
            {groups.length === 0 ? (
                // Not loaded (still loading, or the server failed — the dashboard says which) is not "none".
                seriesLoaded && <Text size="sm">There are no series yet.</Text>
            ) : (
                <div className="filters-series">
                    {groups.map((group) => {
                        const state = unitState(group, hidden);
                        return (
                            <Fieldset key={group.unit} legend={`Series in ${group.label}`}>
                                <Stack gap="xs">
                                    <Checkbox
                                        label={`All ${group.label}`}
                                        checked={state === "all"}
                                        indeterminate={state === "some"}
                                        onChange={() => {
                                            onToggleUnit(group);
                                        }}
                                    />
                                    {group.series.map((series) => (
                                        <Checkbox
                                            key={series.id}
                                            label={<SeriesLabel series={series} />}
                                            checked={!hidden.has(series.id)}
                                            onChange={() => {
                                                onToggleSeries(series.id);
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Fieldset>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
