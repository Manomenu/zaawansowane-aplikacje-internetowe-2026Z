// This feature's HTTP calls, typed from the generated OpenAPI types.
import { request } from "../api/client";
import type { components } from "../api/openapi";

type LoginResponse = components["schemas"]["LoginResponse"];
type LoginRequest = components["schemas"]["LoginRequest"];
type PasswordChange = components["schemas"]["PasswordChange"];

/** Exchanges the credentials for a Bearer token. */
export async function login(credentials: LoginRequest): Promise<string> {
    const response = await request<LoginResponse>("/auth/login", { method: "POST", body: credentials });
    return response.accessToken;
}

export function logout(token: string): Promise<void> {
    return request<undefined>("/auth/logout", { method: "POST", token });
}

export function changePassword(token: string, change: PasswordChange): Promise<void> {
    return request<undefined>("/auth/password", { method: "PUT", token, body: change });
}
