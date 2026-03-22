import React from "react";
import DonutBreakdownChart from "@/components/charts/DonutBreakdownChart.jsx";
import Card from "@/components/ui/Card.jsx";

export default function AccountsPieChart({ accounts }) {
    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                Allocation
            </p>
            <div className="mt-2">
                <h2 className="text-xl font-semibold text-[var(--text-main)]">
                    Account composition
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Balance split across your connected accounts.
                </p>
            </div>
            <div className="mt-6">
                <DonutBreakdownChart
                    items={accounts.map((account) => ({
                        label: account.name,
                        value: account.balance,
                    }))}
                />
            </div>
        </Card>
    );
}
