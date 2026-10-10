// What the register form checks before anything is sent. The server checks again.

export const MAX_NAME_LENGTH = 100;

export interface RegisterErrors {
    name?: string | undefined;
    seriesId?: string | undefined;
}

/** The server's notion of "the same name": ignoring case and spaces at the edges. */
function sameName(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function validateRegistration(values: { name: string; seriesId: string | null }, sensorNames: readonly string[]): RegisterErrors {
    const errors: RegisterErrors = {};
    const name = values.name.trim();
    if (name === "") errors.name = "Enter the sensor's name.";
    else if (name.length > MAX_NAME_LENGTH) errors.name = `The name can have at most ${MAX_NAME_LENGTH} characters.`;
    else if (sensorNames.some((other) => sameName(other, name))) errors.name = "A sensor with this name already exists";
    if (values.seriesId === null || values.seriesId === "") errors.seriesId = "Choose the series the sensor measures.";
    return errors;
}
