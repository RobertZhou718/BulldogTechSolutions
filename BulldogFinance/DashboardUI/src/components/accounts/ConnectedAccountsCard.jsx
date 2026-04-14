import React from "react";
import Card from "@/components/ui/Card.jsx";
import { formatCurrency } from "@/lib/utils";

function getSourceLabel(account) {
    return account.externalSource === "Plaid" ? "Plaid" : "Manual";
}

function getTypeLabel(account) {
    if (!account.type) {
        return "Account";
    }

    return String(account.type)
        .split(":")
        .filter(Boolean)
        .map((part) => part.replace(/_/g, " "))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" / ");
}

export default function ConnectedAccountsCard({ accounts }) {
    return (
        <Card className="xl:col-span-12">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                        Accounts
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                        Connected and manual accounts
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Review each account source, institution, and current balance in one place.
                    </p>
                </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)]">
                <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1.2fr_1.1fr] gap-4 bg-[var(--bg-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)] md:grid">
                    <span>Account</span>
                    <span>Source</span>
                    <span>Institution</span>
                    <span>Available</span>
                    <span className="text-right">Current</span>
                </div>

                <div className="divide-y divide-[var(--card-border)]">
                    {accounts.map((account) => (
                        <div
                            key={account.accountId}
                            className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1.2fr_1.1fr] md:items-center md:gap-4"
                        >
                            <div>
                                <p className="font-semibold text-[var(--text-main)]">{account.name}</p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    {getTypeLabel(account)}
                                    {account.mask ? ` •••• ${account.mask}` : ""}
                                </p>
                            </div>

                            <div>
                                <span className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--card-bg-strong)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                                    {getSourceLabel(account)}
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-[var(--text-main)]">
                                    {account.institutionName || "Added manually"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-[var(--text-main)]">
                                    {account.availableBalance != null
                                        ? formatCurrency(account.availableBalance, account.currency, 2)
                                        : "N/A"}
                                </p>
                            </div>

                            <div className="text-left md:text-right">
                                <p className="font-semibold text-[var(--text-main)]">
                                    {formatCurrency(account.currentBalance, account.currency, 2)}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-soft)]">{account.currency}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
