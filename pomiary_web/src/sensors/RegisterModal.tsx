import { Alert, Button, Group, Modal, Select, Stack, TextInput } from "@mantine/core";
import { useState, type SubmitEvent } from "react";

import { ApiError } from "../api/client";
import { registerSensor, type Series, type SensorCreated } from "./api";
import { MAX_NAME_LENGTH, validateRegistration, type RegisterErrors } from "./validation";

interface Props {
    opened: boolean;
    onClose: () => void;
    token: string;
    onUnauthorized: () => void;
    series: readonly Series[];
    /** The names of the registered sensors, to catch a taken name before sending. */
    sensorNames: readonly string[];
    /** Gets the answer with the key; the parent shows it once. */
    onRegistered: (created: SensorCreated) => void;
}

/** The register form in a dialog: name and series; the server's field errors go under the fields. */
export function RegisterModal({ opened, onClose, ...rest }: Props) {
    return (
        <Modal opened={opened} onClose={onClose} title="Register a sensor">
            <RegisterForm {...rest} onCancel={onClose} />
        </Modal>
    );
}

function RegisterForm({
    token,
    onUnauthorized,
    series,
    sensorNames,
    onRegistered,
    onCancel,
}: Omit<Props, "opened" | "onClose"> & { onCancel: () => void }) {
    const [name, setName] = useState("");
    const [seriesId, setSeriesId] = useState<string | null>(null);
    const [errors, setErrors] = useState<RegisterErrors>({});
    const [failure, setFailure] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFailure(null);
        const found = validateRegistration({ name, seriesId }, sensorNames);
        setErrors(found);
        if (Object.keys(found).length > 0 || seriesId === null) return;

        setSending(true);
        try {
            onRegistered(await registerSensor(token, { name: name.trim(), seriesId: Number(seriesId) }));
        } catch (e) {
            if (!(e instanceof ApiError)) throw e;
            if (e.status === 401) onUnauthorized();
            else {
                setErrors({ name: e.fieldErrors["name"], seriesId: e.fieldErrors["seriesId"] });
                setFailure(e.detail);
            }
            setSending(false);
        }
    }

    return (
        <form
            onSubmit={(event) => {
                void submit(event);
            }}
            noValidate
        >
            <Stack>
                {failure !== null && (
                    <Alert color="red" role="alert">
                        {failure}
                    </Alert>
                )}
                <TextInput
                    label="Sensor name"
                    data-autofocus
                    maxLength={MAX_NAME_LENGTH}
                    value={name}
                    onChange={(event) => {
                        setName(event.currentTarget.value);
                    }}
                    error={errors.name}
                />
                <Select
                    label="Series"
                    placeholder="Choose a series"
                    data={series.map((s) => ({ value: String(s.id), label: s.name }))}
                    value={seriesId}
                    onChange={setSeriesId}
                    error={errors.seriesId}
                    allowDeselect={false}
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={sending}>
                        Register
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
