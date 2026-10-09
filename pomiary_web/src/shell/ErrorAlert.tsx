import { Alert, Button, Group } from "@mantine/core";

/** A failed load, in words the user can read, with a Retry button when the caller can retry. */
export function ErrorAlert({ error, onRetry }: { error: Error; onRetry?: () => void }) {
    return (
        <Alert color="red" title="Something went wrong" role="alert">
            <Group justify="space-between" align="center">
                <span>{error.message}</span>
                {onRetry !== undefined && (
                    <Button variant="default" size="xs" onClick={onRetry}>
                        Retry
                    </Button>
                )}
            </Group>
        </Alert>
    );
}
