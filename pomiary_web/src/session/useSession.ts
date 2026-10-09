import { useCallback, useState } from "react";

import { logout } from "./api";
import { clearSession, loadSession, saveSession, type Session } from "./storage";

const SESSION_ENDED_NOTICE = "Your session has ended. Log in again.";
const LOGOUT_FAILED_NOTICE =
    "You are logged out here, but the server could not be reached to end the session; it ends by itself within an hour.";

/**
 * The admin session of the whole page: who is logged in, the notice about it, and the three
 * ways it changes. `onUnauthorized` is the one path for a 401 from any admin call.
 */
export function useSession() {
    const [session, setSession] = useState<Session | null>(loadSession);
    const [notice, setNotice] = useState<string | null>(null);

    const logIn = useCallback((next: Session) => {
        saveSession(next);
        setSession(next);
        setNotice(null);
    }, []);

    const drop = useCallback(() => {
        clearSession();
        setSession(null);
    }, []);

    /** An admin call answered 401: the token is no longer valid. */
    const onUnauthorized = useCallback(() => {
        drop();
        setNotice(SESSION_ENDED_NOTICE);
    }, [drop]);

    const logOut = useCallback(async () => {
        const token = session?.token;
        drop();
        if (token === undefined) return;
        try {
            await logout(token);
        } catch {
            setNotice(LOGOUT_FAILED_NOTICE);
        }
    }, [session, drop]);

    const dismissNotice = useCallback(() => {
        setNotice(null);
    }, []);

    return { session, notice, logIn, logOut, onUnauthorized, dismissNotice };
}
