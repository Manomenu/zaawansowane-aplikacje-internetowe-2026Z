import { Button, Group, Stack, Table, Text, Title, VisuallyHidden } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../api/client";
import { ErrorAlert } from "../shell/ErrorAlert";
import { Loading } from "../shell/Loading";
import { listSensors, listSeries, type Sensor, type SensorCreated, type Series } from "./api";
import { formatMoment } from "./command";
import { KeyModal } from "./KeyModal";
import { RegisterModal } from "./RegisterModal";
import { UnregisterModal } from "./UnregisterModal";

/** Width under which the table scrolls in its own box instead of squeezing. */
const TABLE_MIN_WIDTH = 560;

interface Loaded {
    sensors: Sensor[];
    series: Series[];
}

/** The Sensors tab: the registered sensors, registering one (the key is shown once) and unregistering. */
export function Sensors({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [reloads, setReloads] = useState(0);
    const [registering, setRegistering] = useState(false);
    // The new sensor's key lives here only while its dialog is open.
    const [created, setCreated] = useState<SensorCreated | null>(null);
    const [removing, setRemoving] = useState<Sensor | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            try {
                const [sensors, series] = await Promise.all([listSensors(token, controller.signal), listSeries(controller.signal)]);
                if (controller.signal.aborted) return;
                setLoaded({ sensors, series });
                setError(null);
            } catch (e) {
                if (controller.signal.aborted) return;
                if (e instanceof ApiError && e.status === 401) onUnauthorized();
                else setError(e instanceof Error ? e : new Error(String(e)));
            }
        })();
        return () => {
            controller.abort();
        };
    }, [token, onUnauthorized, reloads]);

    const reload = useCallback(() => {
        setReloads((n) => n + 1);
    }, []);

    if (error !== null && loaded === null) return <ErrorAlert error={error} onRetry={reload} />;
    if (loaded === null) return <Loading label="Loading sensors…" />;

    const seriesById = new Map(loaded.series.map((s) => [s.id, s]));

    return (
        <Stack>
            <Group justify="space-between" align="center">
                <Title order={2} size="h3">
                    Sensors
                </Title>
                <Button
                    onClick={() => {
                        setRegistering(true);
                    }}
                >
                    Register a sensor
                </Button>
            </Group>
            {error !== null && <ErrorAlert error={error} onRetry={reload} />}
            {loaded.sensors.length === 0 ? (
                <Text>No sensors yet. Register one to get an API key for it.</Text>
            ) : (
                <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Sensor</Table.Th>
                                <Table.Th>Series</Table.Th>
                                <Table.Th>Registered</Table.Th>
                                <Table.Th>Last measurement</Table.Th>
                                <Table.Th>
                                    <VisuallyHidden>Actions</VisuallyHidden>
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {loaded.sensors.map((sensor) => (
                                <Table.Tr key={sensor.id}>
                                    <Table.Td>{sensor.name}</Table.Td>
                                    <Table.Td>{seriesById.get(sensor.seriesId)?.name ?? `Series ${sensor.seriesId}`}</Table.Td>
                                    <Table.Td>{formatMoment(sensor.createdAt)}</Table.Td>
                                    <Table.Td>{formatMoment(sensor.lastMeasurementAt)}</Table.Td>
                                    <Table.Td>
                                        <Button
                                            variant="default"
                                            size="xs"
                                            aria-label={`Unregister ${sensor.name}`}
                                            onClick={() => {
                                                setRemoving(sensor);
                                            }}
                                        >
                                            Unregister
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            )}
            <RegisterModal
                opened={registering}
                onClose={() => {
                    setRegistering(false);
                }}
                token={token}
                onUnauthorized={onUnauthorized}
                series={loaded.series}
                sensorNames={loaded.sensors.map((sensor) => sensor.name)}
                onRegistered={(next) => {
                    setRegistering(false);
                    setCreated(next);
                    reload();
                }}
            />
            <KeyModal
                created={created}
                series={created === null ? undefined : seriesById.get(created.seriesId)}
                onClose={() => {
                    setCreated(null);
                }}
            />
            <UnregisterModal
                sensor={removing}
                token={token}
                onUnauthorized={onUnauthorized}
                onClose={() => {
                    setRemoving(null);
                }}
                onUnregistered={() => {
                    setRemoving(null);
                    reload();
                }}
            />
        </Stack>
    );
}
