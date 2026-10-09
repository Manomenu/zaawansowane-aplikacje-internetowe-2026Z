import { Center, Loader } from "@mantine/core";

/** A centred spinner for a screen that is waiting for the server; announced to screen readers. */
export function Loading({ label = "Loading…" }: { label?: string }) {
    return (
        <Center p="xl" role="status" aria-label={label}>
            <Loader />
        </Center>
    );
}
