import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { ApiError } from "../api/client";
import { unregisterSensor, type Sensor } from "./api";

interface Props {
    sensor: Sensor | null;
    token: string;
    onUnauthorized: () => void;
    onClose: () => void;
    onUnregistered: () => void;
}

/** The confirmation before a sensor is unregistered: its key stops working at once. */
export function UnregisterModal({ sensor, token, onUnauthorized, onClose, onUnregistered }: Props) {
    const [sending, setSending] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    async function confirm() {
        if (sensor === null) return;
        setSending(true);
        setFailure(null);
        try {
            await unregisterSensor(token, sensor.id);
            onUnregistered();
        } catch (e) {
            if (!(e instanceof ApiError)) throw e;
            if (e.status === 401) onUnauthorized();
            else setFailure(e.detail);
        } finally {
            setSending(false);
        }
    }

    return (
        <Modal opened={sensor !== null} onClose={onClose} title="Unregister the sensor?">
            <Stack>
                {failure !== null && (
                    <Alert color="red" role="alert">
                        {failure}
                    </Alert>
                )}
                <Text>
                    Unregistering <strong>{sensor?.name}</strong> makes its API key stop working at once. The measurements it already sent
                    stay.
                </Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose} data-autofocus>
                        Cancel
                    </Button>
                    <Button
                        color="red"
                        loading={sending}
                        onClick={() => {
                            void confirm();
                        }}
                    >
                        Confirm unregister
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
