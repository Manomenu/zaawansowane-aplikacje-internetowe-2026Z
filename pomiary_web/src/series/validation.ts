// What the series form checks before anything is sent. The server checks again (400/422/409);
// this only saves the round trip and puts the message under the field it belongs to.
import type { ApiError } from "../api/client";
import type { SeriesInput } from "./api";

export const MAX_NAME_LENGTH = 100;
export const MAX_UNIT_LENGTH = 20;
export const MARKER_SHAPES = ["circle", "square", "triangle", "diamond"] as const;
export type MarkerShape = (typeof MARKER_SHAPES)[number];
export const DEFAULT_SHAPE: MarkerShape = "circle";
export const DEFAULT_COLOR = "#1c7ed6";

type SeriesField = "name" | "unit" | "minValue" | "maxValue" | "color";
export type SeriesErrors = Partial<Record<SeriesField, string | undefined>>;

/** What the inputs hold: a NumberInput gives a number, or a string while the text is not one. */
export interface SeriesDraft {
    name: string;
    unit: string;
    minValue: number | string;
    maxValue: number | string;
    color: string;
    icon: MarkerShape;
}

export function isMarkerShape(value: string | null | undefined): value is MarkerShape {
    return MARKER_SHAPES.some((shape) => shape === value);
}

/** The shape a stored icon stands for: anything unknown is a circle, as on the chart. */
export function shapeOf(icon: string | null | undefined): MarkerShape {
    return isMarkerShape(icon) ? icon : DEFAULT_SHAPE;
}

export function validateSeries(draft: SeriesDraft): SeriesErrors {
    const errors: SeriesErrors = {};
    const name = draft.name.trim();
    if (name === "") errors.name = "Enter the name.";
    else if (name.length > MAX_NAME_LENGTH) errors.name = `The name can have at most ${String(MAX_NAME_LENGTH)} characters.`;
    if (draft.unit.trim().length > MAX_UNIT_LENGTH) errors.unit = `The unit can have at most ${String(MAX_UNIT_LENGTH)} characters.`;

    const { minValue, maxValue } = draft;
    const minOk = typeof minValue === "number" && Number.isFinite(minValue);
    const maxOk = typeof maxValue === "number" && Number.isFinite(maxValue);
    if (!minOk) errors.minValue = "Enter the minimum as a number.";
    if (!maxOk) errors.maxValue = "Enter the maximum as a number.";
    if (minOk && maxOk && minValue >= maxValue) errors.maxValue = "The maximum must be greater than the minimum.";

    if (!/^#[0-9A-Fa-f]{6}$/.test(draft.color)) errors.color = "Pick a colour as #RRGGBB.";
    return errors;
}

/** The request body for a draft that passed `validateSeries`. */
export function toInput(draft: SeriesDraft): SeriesInput {
    const unit = draft.unit.trim();
    return {
        name: draft.name.trim(),
        unit: unit === "" ? null : unit,
        minValue: Number(draft.minValue),
        maxValue: Number(draft.maxValue),
        color: draft.color,
        icon: draft.icon,
    };
}

export interface ServerFailure {
    /** Messages under their fields. */
    fields: SeriesErrors;
    /** What fits no field (an alert), or null. */
    alert: string | null;
    /** The session is over: the caller ends it. */
    unauthorized: boolean;
}

const FIELDS: readonly SeriesField[] = ["name", "unit", "minValue", "maxValue", "color"];

/**
 * Where an error from the series API is shown. A 409 (the new range would exclude stored
 * measurements) goes under both range fields; field errors of a 400/422 go under their own
 * fields; the rest is an alert.
 */
export function failureOf(error: ApiError): ServerFailure {
    if (error.status === 401) return { fields: {}, alert: null, unauthorized: true };
    if (error.status === 409) return { fields: { minValue: error.detail, maxValue: error.detail }, alert: null, unauthorized: false };
    const fields: SeriesErrors = {};
    for (const field of FIELDS) {
        const message = error.fieldErrors[field];
        if (message !== undefined) fields[field] = message;
    }
    const placed = Object.keys(fields).length > 0;
    return { fields, alert: placed ? null : error.detail, unauthorized: false };
}
