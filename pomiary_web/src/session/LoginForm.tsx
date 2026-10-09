import { Alert, Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import { useState, type SubmitEvent } from "react";

import { ApiError } from "../api/client";
import { login } from "./api";
import type { Session } from "./storage";
import { validateLogin, type Errors } from "./validation";

/** Username and password; Enter submits. A wrong login (401) is an alert, not a field error. */
export function LoginForm({ onLoggedIn }: { onLoggedIn: (session: Session) => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<Errors<"username" | "password">>({});
    const [failure, setFailure] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const found = validateLogin({ username, password });
        setErrors(found);
        setFailure(null);
        if (Object.keys(found).length > 0) return;

        setSending(true);
        try {
            const token = await login({ username: username.trim(), password });
            onLoggedIn({ token, username: username.trim() });
        } catch (e) {
            if (e instanceof ApiError) {
                setErrors({ username: e.fieldErrors["username"], password: e.fieldErrors["password"] });
                setFailure(e.detail);
            } else throw e;
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
        >
            <Stack>
                {failure !== null && (
                    <Alert color="red" role="alert">
                        {failure}
                    </Alert>
                )}
                <TextInput
                    label="Username"
                    autoComplete="username"
                    data-autofocus
                    value={username}
                    onChange={(event) => {
                        setUsername(event.currentTarget.value);
                    }}
                    error={errors.username}
                />
                <PasswordInput
                    label="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                        setPassword(event.currentTarget.value);
                    }}
                    error={errors.password}
                />
                <Button type="submit" loading={sending}>
                    Log in
                </Button>
            </Stack>
        </form>
    );
}
