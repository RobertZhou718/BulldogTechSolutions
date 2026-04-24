import React, { useMemo, useState } from "react";
import { BREAKDOWN_COLORS } from "@/components/ui/breakdownColors.js";

// Donut geometry: outer/inner radius + a small angular gap between segments
// so they read as clean segments instead of one continuous ring.
const SIZE = 240;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 108;
const INNER_RADIUS = 74;
const HOVER_PUSH = 6;
const GAP_DEGREES = 1.4;

function toRadians(degrees) {
    return ((degrees - 90) * Math.PI) / 180;
}

function pointOnCircle(cx, cy, radius, angle) {
    const rad = toRadians(angle);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

// Builds a donut-segment path using two arcs (outer forward, inner reverse).
function describeSegment(cx, cy, outerR, innerR, startAngle, endAngle) {
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    const outerStart = pointOnCircle(cx, cy, outerR, startAngle);
    const outerEnd = pointOnCircle(cx, cy, outerR, endAngle);
    const innerEnd = pointOnCircle(cx, cy, innerR, endAngle);
    const innerStart = pointOnCircle(cx, cy, innerR, startAngle);

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
        "Z",
    ].join(" ");
}

function formatAmount(value) {
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export default function DonutBreakdownChart({ items }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const { segments, total, positives } = useMemo(() => {
        const normalized = items.map((item, index) => {
            const rawValue = Number(item.value || 0);
            return {
                index,
                label: item.label,
                rawValue,
                drawable: Math.max(rawValue, 0),
                isNegative: rawValue < 0,
                color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
            };
        });

        const drawableTotal =
            normalized.reduce((sum, item) => sum + item.drawable, 0) || 0;
        const positiveCount = normalized.filter((item) => item.drawable > 0).length;
        // Only leave gaps between segments when there are multiple positive slices;
        // a single slice should read as a full ring.
        const gap = positiveCount > 1 ? GAP_DEGREES : 0;

        const { segs } = normalized.reduce(
            (state, item) => {
                if (item.drawable <= 0 || drawableTotal === 0) {
                    return {
                        cursor: state.cursor,
                        segs: [...state.segs, { ...item, path: null, midAngle: null, percent: 0 }],
                    };
                }

                const sweep = (item.drawable / drawableTotal) * 360;
                const startAngle = state.cursor + gap / 2;
                const endAngle = state.cursor + sweep - gap / 2;

                return {
                    cursor: state.cursor + sweep,
                    segs: [
                        ...state.segs,
                        {
                            ...item,
                            path: describeSegment(CENTER, CENTER, OUTER_RADIUS, INNER_RADIUS, startAngle, endAngle),
                            midAngle: (startAngle + endAngle) / 2,
                            percent: (item.drawable / drawableTotal) * 100,
                        },
                    ],
                };
            },
            { cursor: 0, segs: [] }
        );

        return { segments: segs, total: drawableTotal, positives: positiveCount };
    }, [items]);

    const active = hoveredIndex != null ? segments[hoveredIndex] : null;
    const hasAny = positives > 0;

    const centerPrimary = active
        ? active.label
        : hasAny
        ? "Total"
        : "No data";
    const centerValue = active
        ? formatAmount(active.rawValue)
        : formatAmount(total);
    const centerSub = active
        ? `${active.percent.toFixed(1)}% of total`
        : hasAny
        ? `${positives} ${positives === 1 ? "account" : "accounts"}`
        : "Add an account to see allocation";

    return (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
            <div className="relative mx-auto h-60 w-60">
                <svg
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    className="h-full w-full"
                    role="img"
                    aria-label="Account allocation donut chart"
                >
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={(OUTER_RADIUS + INNER_RADIUS) / 2}
                        fill="none"
                        stroke="rgba(16, 24, 40, 0.06)"
                        strokeWidth={OUTER_RADIUS - INNER_RADIUS}
                    />
                    {segments.map((seg) => {
                        if (!seg.path) return null;

                        const isHovered = hoveredIndex === seg.index;
                        const dim = hoveredIndex != null && !isHovered;
                        // Push hovered slice outward along its mid-angle for a subtle lift.
                        const offset = isHovered && seg.midAngle != null
                            ? pointOnCircle(0, 0, HOVER_PUSH, seg.midAngle)
                            : { x: 0, y: 0 };

                        return (
                            <path
                                key={seg.label}
                                d={seg.path}
                                fill={seg.color}
                                opacity={dim ? 0.35 : 1}
                                transform={`translate(${offset.x} ${offset.y})`}
                                style={{
                                    transition: "transform 180ms ease-out, opacity 180ms ease-out",
                                    cursor: "pointer",
                                }}
                                onMouseEnter={() => setHoveredIndex(seg.index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                    })}
                </svg>

                <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                >
                    <p className="max-w-[120px] truncate text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
                        {centerPrimary}
                    </p>
                    <p className="mt-1 text-[22px] font-semibold text-[var(--text-main)]">
                        {centerValue}
                    </p>
                    <p className="mt-1 max-w-[140px] text-[11px] text-[var(--text-soft)]">
                        {centerSub}
                    </p>
                </div>
            </div>

            <ul className="space-y-2">
                {segments.map((seg) => {
                    const isHovered = hoveredIndex === seg.index;
                    const dim = hoveredIndex != null && !isHovered;

                    return (
                        <li key={seg.label}>
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredIndex(seg.index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onFocus={() => setHoveredIndex(seg.index)}
                                onBlur={() => setHoveredIndex(null)}
                                className={[
                                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                                    isHovered
                                        ? "border-[var(--card-border-strong)] bg-[var(--bg-subtle)]"
                                        : "border-transparent bg-transparent hover:bg-[var(--bg-subtle)]",
                                    dim ? "opacity-60" : "opacity-100",
                                ].join(" ")}
                            >
                                <span className="flex min-w-0 items-center gap-3">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: seg.color }}
                                    />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-[var(--text-main)]">
                                            {seg.label}
                                        </span>
                                        <span className="block text-xs text-[var(--text-soft)]">
                                            {seg.isNegative
                                                ? "Liability balance"
                                                : total > 0
                                                ? `${seg.percent.toFixed(1)}%`
                                                : "—"}
                                        </span>
                                    </span>
                                </span>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-main)]">
                                    {formatAmount(seg.rawValue)}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
