import { Alert, Button, ColorInput, Group, NumberInput, Select, Stack, TextInput } from "@mantine/core";
import { useState, type SubmitEvent } from "react";

import { ApiError } from "../api/client";
import { createSeries, updateSeries, type Series } from "./api";
import {
    DEFAULT_COLOR,
    DEFAULT_SHAPE,
    failureOf,
    isMarkerShape,
    MARKER_SHAPES,
    shapeOf,
    toInput,
    validateSeries,
    type SeriesDraft,
    type SeriesErrors,
} from "./validation";

function draftOf(series: Series | null): SeriesDraft {
    if (series === null) return { name: "", unit: "", minValue: "", maxValue: "", color: DEFAULT_COLOR, icon: DEFAULT_SHAPE };
    return {
        name: series.name,
        unit: series.unit ?? "",
        minValue: series.minValue,
        maxValue: series.maxValue,
        color: series.color,
        icon: shapeOf(series.icon),
    };
}

/**
 * Create (`series` is null) or edit one series. Checked in the browser first; then the server's
 * answer: 409 and 422 under the range fields, 401 ends the session, anything else in an alert.
 */
export function SeriesForm({
    series,
    allSeries,
    token,
    onUnauthorized,
    onSaved,
    onCancel,
}: {
    series: Series | null;
    /** Every series loaded, to catch a taken name before sending. */
    allSeries: readonly Series[];
    token: string;
    onUnauthorized: () => void;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(() => draftOf(series));
    const [errors, setErrors] = useState<SeriesErrors>({});
    const [failure, setFailure] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    function change(patch: Partial<SeriesDraft>) {
        setDraft((current) => ({ ...current, ...patch }));
    }

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFailure(null);
        const found = validateSeries(
            draft,
            allSeries.filter((other) => other.id !== series?.id).map((other) => other.name),
        );
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setSending(true);
        try {
            const input = toInput(draft);
            if (series === null) await createSeries(token, input);
            else await updateSeries(token, series.id, input);
            onSaved();
        } catch (e) {
            if (!(e instanceof ApiError)) throw e;
            const result = failureOf(e);
            if (result.unauthorized) onUnauthorized();
            setErrors(result.fields);
            setFailure(result.alert);
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
                    label="Name"
                    required
                    data-autofocus
                    value={draft.name}
                    onChange={(event) => {
                        change({ name: event.currentTarget.value });
                    }}
                    error={errors.name}
                />
                <TextInput
                    label="Unit"
                    value={draft.unit}
                    onChange={(event) => {
                        change({ unit: event.currentTarget.value });
                    }}
                    error={errors.unit}
                />
                <Group grow align="flex-start">
                    <NumberInput
                        label="Minimum"
                        required
                        allowDecimal
                        value={draft.minValue}
                        onChange={(value) => {
                            change({ minValue: value });
                        }}
                        error={errors.minValue}
                    />
                    <NumberInput
                        label="Maximum"
                        required
                        allowDecimal
                        value={draft.maxValue}
                        onChange={(value) => {
                            change({ maxValue: value });
                        }}
                        error={errors.maxValue}
                    />
                </Group>
                <ColorInput
                    label="Colour"
                    format="hex"
                    // The eyedropper is an icon button; without a name a screen reader says only "button".
                    eyeDropperButtonProps={{ "aria-label": "Pick a colour from the screen" }}
                    value={draft.color}
                    onChange={(value) => {
                        change({ color: value });
                    }}
                    error={errors.color}
                />
                <Select
                    label="Marker shape"
                    data={[...MARKER_SHAPES]}
                    value={draft.icon}
                    allowDeselect={false}
                    onChange={(value) => {
                        if (isMarkerShape(value)) change({ icon: value });
                    }}
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={sending}>
                        {series === null ? "Create series" : "Save series"}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
