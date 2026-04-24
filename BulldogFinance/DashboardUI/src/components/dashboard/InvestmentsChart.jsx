import React from "react";
import LineTrendChart from "@/components/charts/LineTrendChart.jsx";
import Card from "@/components/ui/Card.jsx";

export default function InvestmentsChart({ dates, portfolioSeries }) {
    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Performance
            </p>
            <div className="mt-2">
                <h2 className="text-xl font-semibold text-[var(--text-main)]">Portfolio trend</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Short-term movement in your tracked portfolio.
                </p>
            </div>
            <div className="mt-6">
                <LineTrendChart
                    labels={dates}
                    series={portfolioSeries.map((item) => ({
                        ...item,
                        color: item.color || "#1570ef",
                    }))}
                />
            </div>
        </Card>
    );
}
