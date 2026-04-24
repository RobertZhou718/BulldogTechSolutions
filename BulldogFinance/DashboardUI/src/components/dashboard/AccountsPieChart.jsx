import React from "react";
import DonutBreakdownChart from "@/components/charts/DonutBreakdownChart.jsx";
import BreakdownList from "@/components/ui/BreakdownList.jsx";
import { BREAKDOWN_COLORS } from "@/components/ui/breakdownColors.js";
import Card from "@/components/ui/Card.jsx";

export default function AccountsPieChart({
    items,
    title = "Account composition",
    description = "Balance split across your connected accounts.",
    renderAsList = false,
}) {
    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Allocation
            </p>
            <div className="mt-2">
                <h2 className="text-xl font-semibold text-[var(--text-main)]">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {description}
                </p>
            </div>
            <div className="mt-6">
                {renderAsList ? (
                    <BreakdownList
                        items={items.map((item, index) => ({
                            id: item.label,
                            label: item.label,
                            value: item.value,
                            color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
                        }))}
                    />
                ) : (
                    <DonutBreakdownChart items={items} />
                )}
            </div>
        </Card>
    );
}
