/**
 * What every feature's HTTP calls share: the API's base path, `request`, and the error a
 * response turns into. The calls themselves live with their feature (`<feature>/api.ts`),
 * like the routes on the server; their types come from the generated `openapi.d.ts`.
 */

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

/** Status of an `ApiError` for a request that never got an answer (offline, server down). */
export const NETWORK_ERROR_STATUS = 0;

/**
 * The error a failed call carries. `detail` is the server's own sentence (also the `message`),
 * `fieldErrors` the Problem's `errors` as `{field: message}` — forms show those under their
 * fields and everything else in an alert.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly detail: string;
    readonly fieldErrors: Readonly<Record<string, string>>;

    constructor(status: number, detail: string, fieldErrors: Readonly<Record<string, string>> = {}) {
        super(detail);
        this.name = "ApiError";
        this.status = status;
        this.detail = detail;
        this.fieldErrors = fieldErrors;
    }
}

/** The part of an `application/problem+json` body the client reads. */
interface Problem {
    detail?: unknown;
    errors?: unknown;
}

function fieldErrorsOf(errors: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (!Array.isArray(errors)) return result;
    for (const item of errors as unknown[]) {
        if (typeof item !== "object" || item === null) continue;
        const { field, message } = item as { field?: unknown; message?: unknown };
        // The first message per field is the one the form shows.
        if (typeof field === "string" && typeof message === "string" && !(field in result)) result[field] = message;
    }
    return result;
}

/** The error a failed response carries: the Problem's `detail` and `errors` when it sent them. */
export async function toError(response: Response): Promise<ApiError> {
    const body = (await response.json().catch(() => null)) as Problem | null;
    const detail = typeof body?.detail === "string" ? body.detail : `${response.status} ${response.statusText}`;
    return new ApiError(response.status, detail, fieldErrorsOf(body?.errors));
}

export interface RequestOptions {
    method?: string;
    /** Sent as JSON. */
    body?: unknown;
    /** An admin's token: sent as `Authorization: Bearer`. */
    token?: string | undefined;
    signal?: AbortSignal | undefined;
}

/** A JSON call to the API: the parsed body (undefined for 204), or an `ApiError`. */
export async function request<T>(path: string, { method = "GET", body, token, signal }: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (token !== undefined) headers["authorization"] = `Bearer ${token}`;

    let response: Response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body === undefined ? null : JSON.stringify(body),
            signal: signal ?? null,
        });
    } catch (e) {
        // An aborted request is the caller's own doing (an effect cleaned up): not an error to show.
        if (signal?.aborted) throw e;
        throw new ApiError(NETWORK_ERROR_STATUS, "The server cannot be reached. Check your connection and try again.");
    }
    if (!response.ok) throw await toError(response);
    return (response.status === 204 ? undefined : await response.json()) as T;
}
