import { markerPoints, type MarkerShape } from "./markers";

interface ShapeProps {
    shape: MarkerShape;
    cx: number;
    cy: number;
    r: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    className?: string;
}

/** One marker drawn at (cx, cy) inside an SVG: the chart's points and the legend share it. */
export function MarkerShapeElement({ shape, cx, cy, r, fill, stroke = "none", strokeWidth = 0, className }: ShapeProps) {
    const points = markerPoints(shape, cx, cy, r);
    return points === null ? (
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className} />
    ) : (
        <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className} />
    );
}

const ICON_SIZE = 14;

/** A series' marker next to its name in the legend, the table header and the checkboxes. Decorative: the name is the text beside it. */
export function MarkerIcon({ shape, color }: { shape: MarkerShape; color: string }) {
    const middle = ICON_SIZE / 2;
    return (
        <svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} aria-hidden="true" focusable="false">
            <MarkerShapeElement
                shape={shape}
                cx={middle}
                cy={middle}
                r={middle - 1}
                fill={color}
                stroke="var(--mantine-color-text)"
                strokeWidth={1}
            />
        </svg>
    );
}
