import { Button, ColorSwatch, Group, Modal, Stack, Table, Text, Title } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../api/client";
import { ErrorAlert } from "../shell/ErrorAlert";
import { Loading } from "../shell/Loading";
import { listSeries, type Series } from "./api";
import { DeleteSeries } from "./DeleteSeries";
import { MarkerIcon } from "./MarkerIcon";
import { SeriesForm } from "./SeriesForm";
import { shapeOf } from "./validation";

/** What the dialog is doing: nothing, creating a series, or editing this one. */
type Editing = "closed" | "new" | Series;

/** The Series tab (admin): the table of series with create, edit and delete. */
export function SeriesAdmin({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
    const [series, setSeries] = useState<Series[] | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [reloads, setReloads] = useState(0);
    const [editing, setEditing] = useState<Editing>("closed");
    const [deleting, setDeleting] = useState<Series | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        listSeries(controller.signal).then(
            (loaded) => {
                setSeries(loaded);
                setError(null);
            },
            (e: unknown) => {
                if (controller.signal.aborted) return;
                setError(e instanceof ApiError ? e : new Error("The series could not be loaded."));
            },
        );
        return () => {
            controller.abort();
        };
    }, [reloads]);

    const reload = useCallback(() => {
        setReloads((n) => n + 1);
    }, []);

    return (
        <Stack>
            <Group justify="space-between">
                <Title order={2} size="h3">
                    Series
                </Title>
                <Button
                    onClick={() => {
                        setEditing("new");
                    }}
                >
                    New series
                </Button>
            </Group>

            {error !== null && <ErrorAlert error={error} onRetry={reload} />}
            {series === null && error === null && <Loading label="Loading series…" />}
            {series?.length === 0 && <Text>No series yet. Create the first one.</Text>}
            {series !== null && series.length > 0 && (
                <Table.ScrollContainer minWidth={600}>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Unit</Table.Th>
                                <Table.Th>Range</Table.Th>
                                <Table.Th>Colour</Table.Th>
                                <Table.Th>Marker</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {series.map((item) => (
                                <SeriesRow
                                    key={item.id}
                                    series={item}
                                    onEdit={() => {
                                        setEditing(item);
                                    }}
                                    onDelete={() => {
                                        setDeleting(item);
                                    }}
                                />
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            )}

            <Modal
                opened={editing !== "closed"}
                onClose={() => {
                    setEditing("closed");
                }}
                title={editing === "new" || editing === "closed" ? "New series" : "Edit series"}
                centered
            >
                {editing !== "closed" && (
                    <SeriesForm
                        series={editing === "new" ? null : editing}
                        allSeries={series ?? []}
                        token={token}
                        onUnauthorized={onUnauthorized}
                        onSaved={() => {
                            setEditing("closed");
                            reload();
                        }}
                        onCancel={() => {
                            setEditing("closed");
                        }}
                    />
                )}
            </Modal>
            <DeleteSeries
                series={deleting}
                token={token}
                onUnauthorized={onUnauthorized}
                onDeleted={() => {
                    setDeleting(null);
                    reload();
                }}
                onClose={() => {
                    setDeleting(null);
                }}
            />
        </Stack>
    );
}

function SeriesRow({ series, onEdit, onDelete }: { series: Series; onEdit: () => void; onDelete: () => void }) {
    const shape = shapeOf(series.icon);
    return (
        <Table.Tr>
            <Table.Td>{series.name}</Table.Td>
            <Table.Td>{series.unit ?? ""}</Table.Td>
            <Table.Td>
                {series.minValue} – {series.maxValue}
            </Table.Td>
            <Table.Td>
                <Group gap="xs" wrap="nowrap">
                    <ColorSwatch color={series.color} size={16} aria-hidden />
                    <span>{series.color}</span>
                </Group>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" wrap="nowrap">
                    <MarkerIcon shape={shape} color={series.color} />
                    <span>{shape}</span>
                </Group>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" wrap="nowrap">
                    <Button variant="default" size="xs" onClick={onEdit} aria-label={`Edit ${series.name}`}>
                        Edit
                    </Button>
                    <Button variant="default" color="red" size="xs" onClick={onDelete} aria-label={`Delete ${series.name}`}>
                        Delete
                    </Button>
                </Group>
            </Table.Td>
        </Table.Tr>
    );
}
