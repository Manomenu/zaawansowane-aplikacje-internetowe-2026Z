import { Modal } from "@mantine/core";

import { LoginForm } from "./LoginForm";
import type { Session } from "./storage";

/** The login form in a dialog, opened from the header. */
export function LoginModal({
    opened,
    onClose,
    onLoggedIn,
}: {
    opened: boolean;
    onClose: () => void;
    onLoggedIn: (session: Session) => void;
}) {
    return (
        <Modal opened={opened} onClose={onClose} title="Log in" centered>
            <LoginForm onLoggedIn={onLoggedIn} />
        </Modal>
    );
}
