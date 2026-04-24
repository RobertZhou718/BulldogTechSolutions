import React from "react";
import Card from "@/components/ui/Card.jsx";

export default function GreetingCard({ isMultiCurrency = false, name, totalLabel }) {
    return (
        <Card className="h-full bg-[linear-gradient(160deg,rgba(21,112,239,0.08)_0%,rgba(255,255,255,0.96)_48%,rgba(18,183,106,0.06)_100%)]">
            <span className="inline-flex rounded-full border border-[var(--card-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                All linked accounts
            </span>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Overview
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                Good to see you, {name || "Investor"}
            </h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
                {isMultiCurrency
                    ? "Here is a grouped snapshot of your linked-account balances without FX conversion."
                    : "Here is a quick snapshot of your aggregated balances across linked accounts."}
            </p>
            <div className="mt-8">
                <p className="text-sm text-[var(--text-soft)]">Total net worth</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--text-main)]">
                    {totalLabel}
                </p>
            </div>
        </Card>
    );
}
