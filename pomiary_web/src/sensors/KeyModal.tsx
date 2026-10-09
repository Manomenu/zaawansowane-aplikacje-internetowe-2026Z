import { Alert, Button, Code, CopyButton, Group, Modal, Stack, Text, TextInput } from "@mantine/core";

import type { SensorCreated, Series } from "./api";
import { buildGeneratorCommand } from "./command";

interface Props {
    created: SensorCreated | null;
    series: Series | undefined;
    onClose: () => void;
}

/**
 * Shows a new sensor's key. The parent holds the key only while this is open and drops it on
 * close: the server keeps just a hash, so nobody can get it again.
 */
export function KeyModal({ created, series, onClose }: Props) {
    const command =
        created === null || series === undefined
            ? null
            : buildGeneratorCommand({
                  api: window.location.origin,
                  apiKey: created.apiKey,
                  minValue: series.minValue,
                  maxValue: series.maxValue,
              });

    return (
        <Modal
            opened={created !== null}
            onClose={onClose}
            title="Sensor registered"
            size="lg"
            closeOnClickOutside={false}
            transitionProps={{ duration: 0 }}
        >
            {created !== null && (
                <Stack>
                    <Alert color="yellow" title="Copy the key now">
                        This key is shown only once. The server keeps only a hash of it, so it can never be shown again. If you lose it,
                        unregister the sensor and register a new one.
                    </Alert>
                    <Text>
                        Sensor <strong>{created.name}</strong> sends its measurements with this key in the <Code>X-API-Key</Code> header.
                    </Text>
                    <Group align="flex-end" wrap="nowrap">
                        <TextInput
                            label="API key"
                            readOnly
                            value={created.apiKey}
                            style={{ flex: 1 }}
                            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                            data-autofocus
                        />
                        <CopyButton value={created.apiKey}>
                            {({ copied, copy }) => (
                                <Button onClick={copy} color={copied ? "teal" : "blue"} aria-label="Copy the key">
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                            )}
                        </CopyButton>
                    </Group>
                    {command !== null && (
                        <>
                            <Text size="sm">To try it, run the data generator:</Text>
                            <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                {command}
                            </Code>
                            <CopyButton value={command}>
                                {({ copied, copy }) => (
                                    <Button variant="default" onClick={copy} aria-label="Copy the command">
                                        {copied ? "Copied" : "Copy command"}
                                    </Button>
                                )}
                            </CopyButton>
                        </>
                    )}
                    <Group justify="flex-end">
                        <Button onClick={onClose}>Done</Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
