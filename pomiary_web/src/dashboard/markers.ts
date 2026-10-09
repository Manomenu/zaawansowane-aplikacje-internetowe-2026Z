// A series is told apart by its marker shape, not by colour alone (T6). The shape comes from
// the series' `icon`; anything the chart cannot draw becomes a circle.

export type MarkerShape = "circle" | "square" | "triangle" | "diamond";

const SHAPES: readonly MarkerShape[] = ["circle", "square", "triangle", "diamond"];

export function markerShape(icon: string | null | undefined): MarkerShape {
    const name = icon?.trim().toLowerCase();
    return SHAPES.find((shape) => shape === name) ?? "circle";
}

/** The points of the polygon for a shape centred on (cx, cy) with radius r; null for a circle. */
export function markerPoints(shape: MarkerShape, cx: number, cy: number, r: number): string | null {
    switch (shape) {
        case "circle":
            return null;
        case "square":
            return `${cx - r},${cy - r} ${cx + r},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`;
        case "triangle":
            return `${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`;
        case "diamond":
            return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
    }
}
