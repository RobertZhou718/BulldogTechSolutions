import React from "react";
import Card from "@/components/ui/Card.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrency } from "@/lib/utils";

const quantityFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
});

function getActivityLabel(item) {
    const subtype = item.Subtype ?? item.subtype;
    const type = item.Type ?? item.type;
    return subtype && subtype !== "Undefined" ? subtype : type || "Activity";
}

export default function InvestmentActivityCard({ items, loading }) {
    const list = Array.isArray(items) ? items : [];

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Activity
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                Recent investment transactions
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Buys, sells, dividends, fees, and transfers synced from connected investment accounts.
            </p>

            {loading && list.length === 0 ? (
                <div className="flex justify-center py-10">
                    <Spinner className="h-7 w-7" />
                </div>
            ) : list.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--text-muted)]">
                    No Plaid investment activity has been synced yet.
                </p>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)]">
                        <thead>
                            <tr className="bg-[var(--bg-main)] text-left text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-soft)]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Activity</th>
                                <th className="px-4 py-3">Security</th>
                                <th className="px-4 py-3">Account</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)] bg-[var(--card-bg-strong)] text-sm">
                            {list.map((item) => {
                                const id = item.TransactionId ?? item.transactionId;
                                const date = item.DateUtc ?? item.dateUtc;
                                const symbol = item.Symbol ?? item.symbol;
                                const securityName = item.SecurityName ?? item.securityName;
                                const accountName = item.AccountName ?? item.accountName;
                                const institutionName = item.InstitutionName ?? item.institutionName;
                                const quantity = item.Quantity ?? item.quantity ?? 0;
                                const amount = item.Amount ?? item.amount ?? 0;
                                const currency = item.Currency ?? item.currency ?? "USD";

                                return (
                                    <tr key={id}>
                                        <td className="px-4 py-4 text-[var(--text-main)]">
                                            {date ? new Date(date).toLocaleDateString() : "-"}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-[var(--text-main)]">
                                            {getActivityLabel(item)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-medium text-[var(--text-main)]">
                                                {symbol || "Cash"}
                                            </p>
                                            {securityName ? (
                                                <p className="mt-1 max-w-56 truncate text-xs text-[var(--text-soft)]">
                                                    {securityName}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-[var(--text-main)]">{accountName || "-"}</p>
                                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                                                {institutionName || "Plaid"}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {quantity ? quantityFormatter.format(quantity) : "-"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-[var(--text-main)]">
                                            {formatCurrency(amount, currency, 2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
