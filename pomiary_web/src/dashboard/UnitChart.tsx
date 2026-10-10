import { Group, Text } from "@mantine/core";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

import type { Series } from "./api";
import { tickFormatter } from "./axis";
import { MarkerIcon, MarkerShapeElement } from "./Marker";
import { markerShape } from "./markers";
import { pointKey, type ChartPoint } from "./table";

const CHART_HEIGHT = 280;
const POINT_RADIUS = 5;
const SELECTED_RADIUS = 9;

const tickStyle = { fill: "var(--mantine-color-text)", fontSize: 12 };

interface DotProps {
    cx?: number;
    cy?: number;
    payload?: ChartPoint;
}

interface Props {
    unitLabel: string;
    series: readonly Series[];
    points: readonly ChartPoint[];
    selectedMs: number | null;
    /** The range in words, for the chart's description. */
    rangeLabel: string;
}

/** One chart for one unit (F2): a line per series, each with its own marker shape (T6); the selected moment is outlined (F6). */
export function UnitChart({ unitLabel, series, points, selectedMs, rangeLabel }: Props) {
    const first = points[0]?.["t"] ?? 0;
    const last = points[points.length - 1]?.["t"] ?? 0;
    const formatTick = tickFormatter(last - first);
    const names = series.map((s) => s.name).join(", ");
    const description = `Line chart of ${names} in ${unitLabel}, ${rangeLabel}. The table below has the same values.`;

    return (
        <figure className="unit-chart">
            <figcaption>
                <Text fw={600}>
                    {names} ({unitLabel})
                </Text>
            </figcaption>
            {points.length === 0 ? (
                <Text>No measurements in this range.</Text>
            ) : (
                <div role="img" aria-label={description} className="chart-box">
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                        <LineChart data={[...points]} margin={{ top: 12, right: 16, bottom: 4, left: 4 }} accessibilityLayer={false}>
                            <CartesianGrid stroke="var(--mantine-color-default-border)" />
                            <XAxis
                                dataKey="t"
                                type="number"
                                scale="time"
                                domain={["dataMin", "dataMax"]}
                                tickFormatter={formatTick}
                                tick={tickStyle}
                                stroke="var(--mantine-color-text)"
                            />
                            <YAxis
                                tick={tickStyle}
                                stroke="var(--mantine-color-text)"
                                label={{
                                    value: unitLabel,
                                    angle: -90,
                                    position: "insideLeft",
                                    style: { fill: "var(--mantine-color-text)" },
                                }}
                            />
                            {selectedMs !== null && (
                                <ReferenceLine
                                    x={selectedMs}
                                    stroke="var(--mantine-color-text)"
                                    strokeDasharray="4 3"
                                    className="selected-line"
                                />
                            )}
                            {series.map((s) => {
                                const shape = markerShape(s.icon);
                                const key = pointKey(s.id);
                                return (
                                    <Line
                                        key={s.id}
                                        type="monotone"
                                        dataKey={key}
                                        name={s.name}
                                        stroke={s.color}
                                        strokeWidth={2}
                                        connectNulls
                                        isAnimationActive={false}
                                        activeDot={false}
                                        dot={({ cx, cy, payload }: DotProps) => {
                                            if (cx === undefined || cy === undefined || payload === undefined)
                                                return <g key={`${key}-none`} />;
                                            const selected = payload["t"] === selectedMs;
                                            return (
                                                <MarkerShapeElement
                                                    key={`${key}-${String(payload["t"])}`}
                                                    shape={shape}
                                                    cx={cx}
                                                    cy={cy}
                                                    r={selected ? SELECTED_RADIUS : POINT_RADIUS}
                                                    fill={s.color}
                                                    stroke={selected ? "var(--mantine-color-text)" : "none"}
                                                    strokeWidth={selected ? 3 : 0}
                                                    className={selected ? "selected-point" : "point"}
                                                />
                                            );
                                        }}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
            <Group component="ul" gap="md" className="chart-legend" aria-label={`Legend for ${unitLabel}`}>
                {series.map((s) => (
                    <Group key={s.id} component="li" gap={6} wrap="nowrap">
                        <MarkerIcon shape={markerShape(s.icon)} color={s.color} />
                        <Text component="span" size="sm">
                            {s.name}
                        </Text>
                    </Group>
                ))}
            </Group>
        </figure>
    );
}
