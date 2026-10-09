import type { MarkerShape } from "./validation";

const MARKER_SIZE = 16;

// Each shape in a 16 x 16 box.
const POINTS: Record<Exclude<MarkerShape, "circle" | "square">, string> = {
    triangle: "8,1 15,15 1,15",
    diamond: "8,1 15,8 8,15 1,8",
};

/** A series' marker shape, drawn small, with a text alternative: the shape is told apart without colour (T6). */
export function MarkerIcon({ shape, color }: { shape: MarkerShape; color: string }) {
    return (
        <svg width={MARKER_SIZE} height={MARKER_SIZE} viewBox="0 0 16 16" role="img" aria-label={`Marker: ${shape}`}>
            {shape === "circle" && <circle cx="8" cy="8" r="7" fill={color} stroke="currentColor" />}
            {shape === "square" && <rect x="1" y="1" width="14" height="14" fill={color} stroke="currentColor" />}
            {(shape === "triangle" || shape === "diamond") && <polygon points={POINTS[shape]} fill={color} stroke="currentColor" />}
        </svg>
    );
}
