// What the forms check before anything is sent. The server checks again; this only saves the
// round trip and puts the message under the field it belongs to.

export const MIN_PASSWORD_LENGTH = 8;

export type Errors<Field extends string> = Partial<Record<Field, string | undefined>>;

export function validateLogin(values: { username: string; password: string }): Errors<"username" | "password"> {
    const errors: Errors<"username" | "password"> = {};
    if (values.username.trim() === "") errors.username = "Enter the username.";
    if (values.password === "") errors.password = "Enter the password.";
    return errors;
}

export function validatePasswordChange(values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}): Errors<"currentPassword" | "newPassword" | "confirmPassword"> {
    const errors: Errors<"currentPassword" | "newPassword" | "confirmPassword"> = {};
    if (values.currentPassword === "") errors.currentPassword = "Enter the current password.";
    if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
        errors.newPassword = `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
    } else if (values.newPassword === values.currentPassword) {
        errors.newPassword = "The new password must differ from the current one.";
    }
    if (values.confirmPassword !== values.newPassword) errors.confirmPassword = "The passwords do not match.";
    return errors;
}
