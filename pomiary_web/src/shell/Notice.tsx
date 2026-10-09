import { Alert } from "@mantine/core";

/** A message about the page itself (the session ended); announced politely, can be dismissed. */
export function Notice({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <div aria-live="polite" className="page-notice no-print">
            {message !== "" && (
                <Alert color="yellow" withCloseButton closeButtonLabel="Dismiss the message" onClose={onClose}>
                    {message}
                </Alert>
            )}
        </div>
    );
}
