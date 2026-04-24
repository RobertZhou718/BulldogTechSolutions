import React from "react";
import Card from "@/components/ui/Card.jsx";

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
}

export default function TransactionTable({
    transactions,
    accountNames,
    sortField,
    sortDirection,
    onSortChange,
}) {
    const handleSort = (field) => {
        if (sortField === field) {
            onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
        } else {
            onSortChange(field, "desc");
        }
    };

    const renderAmount = (tx) => {
        const amount = tx.amount ?? 0;
        const currency = tx.currency || "CAD";
        return `${currency} ${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    return (
        <Card>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                History
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                Transaction history
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Sorted record of recent account activity.
            </p>

            {transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)]">
                    No transactions yet. Add your first one above.
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)]">
                        <thead>
                            <tr className="bg-[var(--bg-main)] text-left text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-soft)]">
                                <th className="px-4 py-3">
                                    <button type="button" onClick={() => handleSort("date")}>
                                        Date {sortField === "date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                                <th className="px-4 py-3">Account</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Note</th>
                                <th className="px-4 py-3 text-right">
                                    <button type="button" onClick={() => handleSort("amount")}>
                                        Amount {sortField === "amount" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)] bg-white">
                            {transactions.map((tx) => (
                                <tr key={tx.transactionId || tx.rowKey || tx.id} className="text-sm">
                                    <td className="px-4 py-4 text-[var(--text-muted)]">
                                        {formatDate(tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc)}
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-main)]">
                                        {accountNames?.[tx.accountId] || tx.accountName || tx.accountId}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                tx.type === "EXPENSE"
                                                    ? "bg-[var(--color-error-50)] text-[var(--color-error-700)]"
                                                    : "bg-[var(--color-success-50)] text-[var(--color-success-700)]"
                                            }`}
                                        >
                                            {tx.type === "EXPENSE" ? "Expense" : "Income"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-[var(--text-muted)]">{tx.category || "-"}</td>
                                    <td className="px-4 py-4 text-[var(--text-muted)]">{tx.note || "-"}</td>
                                    <td
                                        className={`px-4 py-4 text-right font-semibold ${
                                            tx.type === "EXPENSE"
                                                ? "text-[var(--color-error-700)]"
                                                : "text-[var(--color-success-700)]"
                                        }`}
                                    >
                                        {tx.type === "EXPENSE" ? "-" : "+"} {renderAmount(tx)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
