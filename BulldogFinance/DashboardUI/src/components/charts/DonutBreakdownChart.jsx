import React, { useMemo, useState } from "react";

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

const colors = ["#1570ef", "#12b76a", "#f79009", "#7a5af8", "#f04438", "#12b76a"];

export default function DonutBreakdownChart({ items }) {
    const [expanded, setExpanded] = useState(false);
    const normalizedItems = items.map((item) => {
        const rawValue = Number(item.value || 0);
        return {
            ...item,
            rawValue,
            drawableValue: Math.max(rawValue, 0),
            isNegative: rawValue < 0,
        };
    });

    const total = normalizedItems.reduce((sum, item) => sum + item.drawableValue, 0) || 1;
    const hiddenCount = Math.max(normalizedItems.length - DEFAULT_VISIBLE_COUNT, 0);
    const visibleItems = useMemo(
        () => (expanded ? normalizedItems : normalizedItems.slice(0, DEFAULT_VISIBLE_COUNT)),
        [expanded, normalizedItems]
    );
    let currentAngle = 0;

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
                {normalizedItems.map((item, index) => {
                    if (item.drawableValue <= 0) {
                        return null;
                    }

                    const slice = (item.drawableValue / total) * 360;
                    const path = describeArc(110, 110, 70, currentAngle, currentAngle + slice);
                    currentAngle += slice;

                    return (
                        <path
                            key={item.label}
                            d={path}
                            stroke={colors[index % colors.length]}
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
                <div className="space-y-3">
                    {visibleItems.map((item) => {
                        const index = normalizedItems.findIndex((candidate) => candidate.label === item.label);

                        return (
                            <div
                                key={item.label}
                                className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-main)]">
                                            {item.label}
                                        </p>
                                        <p className="text-sm text-[var(--text-soft)]">
                                            {item.isNegative
                                                ? "Liability balance"
                                                : `${((item.drawableValue / total) * 100).toFixed(1)}% of total`}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-main)]">
                                    {item.rawValue.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                        );
                    })}
                </div>

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
