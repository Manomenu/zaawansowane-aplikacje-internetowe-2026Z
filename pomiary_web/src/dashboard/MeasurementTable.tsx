import { Table, Text } from "@mantine/core";
import type { KeyboardEvent } from "react";

import type { Series } from "./api";
import { MarkerIcon } from "./Marker";
import { markerShape } from "./markers";
import type { TableRow } from "./table";

// Date and time are two lines of one narrow column, so 13 columns fit side by side.
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "short" });
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "medium" });
const valueFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

interface Props {
    rows: readonly TableRow[];
    series: readonly Series[];
    selectedMs: number | null;
    onSelect: (ms: number | null) => void;
}

/** The measurements as text (F2): a row per moment, a column per series. A row selects with a click, Enter or Space (F6). */
export function MeasurementTable({ rows, series, selectedMs, onSelect }: Props) {
    const toggle = (ms: number) => {
        onSelect(ms === selectedMs ? null : ms);
    };
    const onKeyDown = (event: KeyboardEvent, ms: number) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle(ms);
    };

    if (rows.length === 0) return <Text>No measurements in this range.</Text>;
    return (
        <div className="table-scroll" role="region" aria-label="Measurements table" tabIndex={0}>
            <Table highlightOnHover className="measurement-table" style={{ "--series-count": series.length }}>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th scope="col">Time</Table.Th>
                        {series.map((s) => (
                            <Table.Th key={s.id} scope="col" className="value-cell">
                                <div className="series-head">
                                    <MarkerIcon shape={markerShape(s.icon)} color={s.color} />
                                    <span>{s.unit ? `${s.name} (${s.unit})` : s.name}</span>
                                </div>
                            </Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr
                            key={row.ms}
                            className="data-row"
                            tabIndex={0}
                            aria-selected={row.ms === selectedMs}
                            onClick={() => {
                                toggle(row.ms);
                            }}
                            onKeyDown={(event) => {
                                onKeyDown(event, row.ms);
                            }}
                        >
                            <Table.Td>
                                <span className="time-part">{dateFormat.format(row.ms)}</span>{" "}
                                <span className="time-part">{timeFormat.format(row.ms)}</span>
                            </Table.Td>
                            {series.map((s) => {
                                const value = row.values.get(s.id);
                                return (
                                    <Table.Td key={s.id} className="value-cell">
                                        {value === undefined ? "" : valueFormat.format(value)}
                                    </Table.Td>
                                );
                            })}
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </div>
    );
}
