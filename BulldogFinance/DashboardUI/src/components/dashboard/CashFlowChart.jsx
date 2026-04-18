import React from "react";
import LineTrendChart from "@/components/charts/LineTrendChart.jsx";
import Card from "@/components/ui/Card.jsx";

export default function CashFlowChart({
    periods,
    income,
    expenses,
    series = null,
    description = "Recent movement across recurring income and expenses.",
}) {
    const chartSeries = series ?? [
        { label: "Income", data: income, color: "#12b76a" },
        { label: "Spending", data: expenses, color: "#1570ef" },
    ];

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                Cash flow
            </p>
            <div className="mt-2">
                <h2 className="text-xl font-semibold text-[var(--text-main)]">
                    Income vs. spending
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {description}
                </p>
            </div>
            <div className="mt-6">
                <LineTrendChart
                    labels={periods}
                    series={chartSeries}
                />
            </div>
        </Card>
    );
}
