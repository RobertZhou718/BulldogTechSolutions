import React from "react";

function buildPoints(values, width, height, padding) {
    if (!values.length) return "";

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const stepX = (width - padding * 2) / Math.max(values.length - 1, 1);

    return values
        .map((value, index) => {
            const x = padding + index * stepX;
            const y = height - padding - ((value - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        })
        .join(" ");
}

export default function LineTrendChart({ labels, series, height = 280 }) {
    const width = 720;
    const padding = 24;

    return (
        <div className="space-y-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full overflow-visible">
                {[0.2, 0.4, 0.6, 0.8].map((step) => (
                    <line
                        key={step}
                        x1={padding}
                        x2={width - padding}
                        y1={height * step}
                        y2={height * step}
                        stroke="rgba(16, 24, 40, 0.08)"
                        strokeDasharray="4 6"
                    />
                ))}

                {series.map((item) => (
                    <polyline
                        key={item.label}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={buildPoints(item.data, width, height, padding)}
                    />
                ))}
            </svg>

            <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-soft)]">
                <div className="flex gap-4">
                    {series.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="hidden gap-4 sm:flex">
                    {labels.map((label) => (
                        <span key={label}>{label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
