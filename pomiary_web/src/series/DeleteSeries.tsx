import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { ApiError } from "../api/client";
import { deleteSeries, type Series } from "./api";

/** Asks before deleting: the API takes the series' measurements and sensors along. */
export function DeleteSeries({
    series,
    token,
    onUnauthorized,
    onDeleted,
    onClose,
}: {
    series: Series | null;
    token: string;
    onUnauthorized: () => void;
    onDeleted: () => void;
    onClose: () => void;
}) {
    return (
        <Modal opened={series !== null} onClose={onClose} title="Delete series" centered>
            {series !== null && (
                <Confirm series={series} token={token} onUnauthorized={onUnauthorized} onDeleted={onDeleted} onClose={onClose} />
            )}
        </Modal>
    );
}

function Confirm({
    series,
    token,
    onUnauthorized,
    onDeleted,
    onClose,
}: {
    series: Series;
    token: string;
    onUnauthorized: () => void;
    onDeleted: () => void;
    onClose: () => void;
}) {
    const [failure, setFailure] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function confirm() {
        setFailure(null);
        setSending(true);
        try {
            await deleteSeries(token, series.id);
            onDeleted();
        } catch (e) {
            if (!(e instanceof ApiError)) throw e;
            if (e.status === 401) onUnauthorized();
            else setFailure(e.detail);
            setSending(false);
        }
    }

    return (
        <Stack>
            {failure !== null && (
                <Alert color="red" role="alert">
                    {failure}
                </Alert>
            )}
            <Text>
                Delete the series &quot;{series.name}&quot;? All its measurements and its sensors are deleted with it. This cannot be
                undone.
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
                    Delete series
                </Button>
            </Group>
        </Stack>
    );
}
