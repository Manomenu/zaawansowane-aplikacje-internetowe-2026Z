// The admin's session lives in sessionStorage: it survives a reload but not a closed tab, and
// no script of another origin can read it. Storage is a convenience (AGENTS.md 5.1): it can be
// empty, blocked or hold anything, so everything read from it is validated.

/** Who is logged in: the Bearer token and the name the header shows. */
export interface Session {
    token: string;
    username: string;
}

const SESSION_KEY = "pomiary.session";

/** The stored text as a session, or null when it is missing, not JSON or not the right shape. */
export function parseSession(raw: string | null): Session | null {
    if (raw === null) return null;
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return null;
    }
    if (typeof value !== "object" || value === null) return null;
    const { token, username } = value as { token?: unknown; username?: unknown };
    if (typeof token !== "string" || token === "" || typeof username !== "string" || username === "") return null;
    return { token, username };
}

export function loadSession(): Session | null {
    try {
        return parseSession(sessionStorage.getItem(SESSION_KEY));
    } catch {
        return null; // storage blocked: the user simply has to log in again
    }
}

export function saveSession(session: Session): void {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        // Storage full or blocked: the session lives on in memory until the page is reloaded.
    }
}

export function clearSession(): void {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        // Nothing stored that we could not reach, nothing to clear.
    }
}
