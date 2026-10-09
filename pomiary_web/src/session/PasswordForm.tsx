import { Alert, Button, PasswordInput, Stack, Title } from "@mantine/core";
import { useState, type SubmitEvent } from "react";

import { ApiError } from "../api/client";
import { changePassword } from "./api";
import { validatePasswordChange, type Errors } from "./validation";

type Field = "currentPassword" | "newPassword" | "confirmPassword";

/** The Account tab: change the password. A 403 means the current one is wrong, a 401 ends the session. */
export function PasswordForm({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Errors<Field>>({});
    const [failure, setFailure] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [sending, setSending] = useState(false);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setDone(false);
        setFailure(null);
        const found = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setSending(true);
        try {
            await changePassword(token, { currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setDone(true);
        } catch (e) {
            if (!(e instanceof ApiError)) throw e;
            if (e.status === 401) onUnauthorized();
            else if (e.status === 403) setErrors({ currentPassword: e.detail });
            else {
                setErrors({ currentPassword: e.fieldErrors["currentPassword"], newPassword: e.fieldErrors["newPassword"] });
                setFailure(e.detail);
            }
        } finally {
            setSending(false);
        }
    }

    return (
        <form
            onSubmit={(event) => {
                void submit(event);
            }}
            noValidate
            className="narrow-form"
        >
            <Stack>
                <Title order={2} size="h3">
                    Change password
                </Title>
                {failure !== null && (
                    <Alert color="red" role="alert">
                        {failure}
                    </Alert>
                )}
                {done && (
                    <Alert color="green" role="status">
                        Password changed.
                    </Alert>
                )}
                <PasswordInput
                    label="Current password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => {
                        setCurrentPassword(event.currentTarget.value);
                    }}
                    error={errors.currentPassword}
                />
                <PasswordInput
                    label="New password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => {
                        setNewPassword(event.currentTarget.value);
                    }}
                    error={errors.newPassword}
                />
                <PasswordInput
                    label="Repeat the new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                        setConfirmPassword(event.currentTarget.value);
                    }}
                    error={errors.confirmPassword}
                />
                <Button type="submit" loading={sending}>
                    Change password
                </Button>
            </Stack>
        </form>
    );
}
