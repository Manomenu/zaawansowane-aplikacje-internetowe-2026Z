// The generator command shown with a new key, so the key goes straight where it is used.

export interface CommandInput {
    /** The API's origin, e.g. `https://pomiary-lasy.gugnowski.com`. */
    api: string;
    apiKey: string;
    /** The series' range: the synthetic values stay inside it. */
    minValue: number;
    maxValue: number;
}

export function buildGeneratorCommand({ api, apiKey, minValue, maxValue }: CommandInput): string {
    return [
        "python -m pomiary_generator send",
        `--api ${api}`,
        `--api-key ${apiKey}`,
        "--interval 5s --source synthetic --shape sine",
        `--min ${minValue} --max ${maxValue}`,
    ].join(" ");
}

/** A moment for the table in the reader's locale; `never` for a sensor that has not sent anything. */
export function formatMoment(iso: string | null): string {
    return iso === null ? "never" : new Date(iso).toLocaleString();
}
