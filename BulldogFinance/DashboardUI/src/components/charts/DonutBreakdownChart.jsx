import React, { useMemo, useState } from "react";
import BreakdownList from "@/components/ui/BreakdownList.jsx";
import { BREAKDOWN_COLORS } from "@/components/ui/breakdownColors.js";

const DEFAULT_VISIBLE_COUNT = 3;

function polar(cx, cy, radius, angle) {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(radians),
        y: cy + radius * Math.sin(radians),
    };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
    const start = polar(cx, cy, radius, endAngle);
    const end = polar(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function DonutBreakdownChart({ items }) {
    const [expanded, setExpanded] = useState(false);
    const normalizedItems = useMemo(
        () =>
            items.map((item) => {
                const rawValue = Number(item.value || 0);
                return {
                    ...item,
                    rawValue,
                    drawableValue: Math.max(rawValue, 0),
                    isNegative: rawValue < 0,
                };
            }),
        [items]
    );
    const total = useMemo(
        () => normalizedItems.reduce((sum, item) => sum + item.drawableValue, 0) || 1,
        [normalizedItems]
    );
    const hiddenCount = Math.max(normalizedItems.length - DEFAULT_VISIBLE_COUNT, 0);
    const visibleItems = useMemo(
        () => (expanded ? normalizedItems : normalizedItems.slice(0, DEFAULT_VISIBLE_COUNT)).map((item, index) => ({ item, index })),
        [expanded, normalizedItems]
    );
    const slices = useMemo(
        () =>
            normalizedItems.reduce(
                (state, item, index) => {
                    if (item.drawableValue <= 0) {
                        return {
                            startAngle: state.startAngle,
                            slices: [
                                ...state.slices,
                                {
                                    item,
                                    index,
                                    path: null,
                                },
                            ],
                        };
                    }

                    const sweepAngle = (item.drawableValue / total) * 360;
                    const path = describeArc(
                        110,
                        110,
                        70,
                        state.startAngle,
                        state.startAngle + sweepAngle
                    );

                    return {
                        startAngle: state.startAngle + sweepAngle,
                        slices: [
                            ...state.slices,
                            {
                                item,
                                index,
                                path,
                            },
                        ],
                    };
                },
                { startAngle: 0, slices: [] }
            ).slices,
        [normalizedItems, total]
    );
    const breakdownItems = useMemo(
        () =>
            visibleItems.map(({ item, index }) => ({
                id: item.label,
                label: item.label,
                description: item.isNegative
                    ? "Liability balance"
                    : `${((item.drawableValue / total) * 100).toFixed(1)}% of total`,
                value: item.rawValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }),
                color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
            })),
        [total, visibleItems]
    );

    return (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
            <svg viewBox="0 0 220 220" className="mx-auto h-56 w-56">
                <circle
                    cx="110"
                    cy="110"
                    r="70"
                    stroke="rgba(16, 24, 40, 0.08)"
                    strokeWidth="24"
                    fill="none"
                />
                {slices.map(({ item, index, path }) => {
                    if (!path) {
                        return null;
                    }

                    return (
                        <path
                            key={item.label}
                            d={path}
                            stroke={BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length]}
                            strokeWidth="24"
                            fill="none"
                            strokeLinecap="round"
                        />
                    );
                })}
                <text x="110" y="102" textAnchor="middle" className="fill-[#667085] text-[12px]">
                    Total
                </text>
                <text
                    x="110"
                    y="124"
                    textAnchor="middle"
                    className="fill-[#101828] text-[18px] font-semibold"
                >
                    {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </text>
            </svg>

            <div>
                <BreakdownList items={breakdownItems} />

                {hiddenCount > 0 ? (
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"
                            onClick={() => setExpanded((current) => !current)}
                        >
                            {expanded ? "Collapse" : `+${hiddenCount} more`}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
