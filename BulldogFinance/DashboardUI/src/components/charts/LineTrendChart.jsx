import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_WIDTH = 720;
const TICK_COUNT = 5;

function defaultValueFormatter(value) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: Math.abs(value) >= 10 ? 0 : 1,
        notation: "compact",
    }).format(value);
}

function normalizeSeries(series) {
    return series.map((item) => ({
        ...item,
        data: (item.data ?? []).map((value) => {
            const numberValue = Number(value);
            return Number.isFinite(numberValue) ? numberValue : null;
        }),
    }));
}

function getFiniteValues(series) {
    return series.flatMap((item) => item.data.filter((value) => value !== null));
}

function getNiceStep(range, tickCount) {
    if (range <= 0) return 1;

    const roughStep = range / Math.max(tickCount - 1, 1);
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const normalized = roughStep / magnitude;

    if (normalized <= 1) return magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

function buildYAxis(values) {
    if (!values.length) {
        return { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
    }

    const rawMin = Math.min(...values, 0);
    const rawMax = Math.max(...values, 0);
    const paddedMax = rawMin === rawMax ? rawMax + 1 : rawMax;
    const step = getNiceStep(paddedMax - rawMin, TICK_COUNT);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(paddedMax / step) * step || step;
    const ticks = [];

    for (let value = min; value <= max + step / 2; value += step) {
        ticks.push(Number(value.toFixed(8)));
    }

    return { min, max, ticks };
}

function buildPoints(values, getX, getY) {
    return values
        .map((value, index) => {
            if (value === null) return null;
            return `${getX(index)},${getY(value)}`;
        })
        .filter(Boolean)
        .join(" ");
}

export default function LineTrendChart({
    labels = [],
    series = [],
    height = 280,
    valueFormatter = defaultValueFormatter,
}) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const chartSeries = useMemo(() => normalizeSeries(series), [series]);
    const values = useMemo(() => getFiniteValues(chartSeries), [chartSeries]);
    const yAxis = useMemo(() => buildYAxis(values), [values]);
    const pointCount = Math.max(
        1,
        labels.length,
        ...chartSeries.map((item) => item.data.length)
    );
    const margin = width < 420
        ? { top: 16, right: 14, bottom: 42, left: 48 }
        : { top: 18, right: 20, bottom: 44, left: 64 };
    const plotLeft = margin.left;
    const plotRight = width - margin.right;
    const plotTop = margin.top;
    const plotBottom = height - margin.bottom;
    const plotWidth = Math.max(plotRight - plotLeft, 1);
    const plotHeight = Math.max(plotBottom - plotTop, 1);
    const getX = (index) => (
        pointCount === 1
            ? plotLeft + plotWidth / 2
            : plotLeft + (index / (pointCount - 1)) * plotWidth
    );
    const getY = (value) => {
        const range = yAxis.max - yAxis.min || 1;
        return plotBottom - ((value - yAxis.min) / range) * plotHeight;
    };
    const maxVisibleXLabels = width < 380 ? 4 : 8;
    const xLabelInterval = Math.max(1, Math.ceil(labels.length / maxVisibleXLabels));

    useEffect(() => {
        const element = containerRef.current;
        if (!element || typeof window === "undefined") return undefined;

        const updateWidth = () => {
            const nextWidth = Math.round(element.getBoundingClientRect().width);
            if (nextWidth > 0) {
                setWidth(Math.max(280, nextWidth));
            }
        };

        updateWidth();

        if (!window.ResizeObserver) {
            window.addEventListener("resize", updateWidth);
            return () => window.removeEventListener("resize", updateWidth);
        }

        const resizeObserver = new window.ResizeObserver(updateWidth);
        resizeObserver.observe(element);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="space-y-4">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-[280px] w-full"
                role="img"
                aria-label="Line trend chart"
            >
                {yAxis.ticks.map((tick) => {
                    const y = getY(tick);

                    return (
                        <g key={tick}>
                            <line
                                x1={plotLeft}
                                x2={plotRight}
                                y1={y}
                                y2={y}
                                stroke="rgba(16, 24, 40, 0.08)"
                                strokeDasharray={tick === 0 ? undefined : "4 6"}
                            />
                            <text
                                x={plotLeft - 10}
                                y={y}
                                fill="var(--text-soft)"
                                fontSize="11"
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {valueFormatter(tick)}
                            </text>
                        </g>
                    );
                })}

                <line
                    x1={plotLeft}
                    x2={plotLeft}
                    y1={plotTop}
                    y2={plotBottom}
                    stroke="rgba(16, 24, 40, 0.18)"
                />
                <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={plotBottom}
                    y2={plotBottom}
                    stroke="rgba(16, 24, 40, 0.18)"
                />

                {labels.map((label, index) => {
                    const showLabel = index % xLabelInterval === 0 || index === labels.length - 1;
                    if (!showLabel) return null;

                    return (
                        <g key={`${label}-${index}`}>
                            <line
                                x1={getX(index)}
                                x2={getX(index)}
                                y1={plotBottom}
                                y2={plotBottom + 5}
                                stroke="rgba(16, 24, 40, 0.22)"
                            />
                            <text
                                x={getX(index)}
                                y={height - 16}
                                fill="var(--text-soft)"
                                fontSize="11"
                                textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}

                {chartSeries.map((item) => (
                    <polyline
                        key={item.label}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={buildPoints(item.data, getX, getY)}
                    />
                ))}
            </svg>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-soft)]">
                {chartSeries.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
