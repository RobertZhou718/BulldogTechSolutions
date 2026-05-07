import React from "react";
import Card from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatTransactionDate } from "@/lib/transactionDates.js";

const TYPE_FILTER_OPTIONS = [
    { value: "ALL", label: "All" },
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

export default function TransactionTable({
    transactions,
    accountNames,
    sortField,
    sortDirection,
    onSortChange,
    filters,
    onFiltersChange,
    onResetFilters,
}) {
    const handleSort = (field) => {
        if (sortField === field) {
            onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
        } else {
            onSortChange(field, "desc");
        }
    };

    const handleFilterChange = (field, value) => {
        onFiltersChange?.({ ...filters, [field]: value });
    };

    const hasActiveFilters =
        filters &&
        ((filters.type && filters.type !== "ALL") ||
            filters.from ||
            filters.to ||
            filters.category);

    const renderAmount = (tx) => {
        const amount = tx.amount ?? 0;
        const currency = tx.currency || "CAD";
        return `${currency} ${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const formatCategory = (raw) => {
        if (!raw) return "-";
        return raw
            .toString()
            .toLowerCase()
            .split("_")
            .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
            .join(" ");
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

            {filters && onFiltersChange && (
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Type">
                        <Select
                            value={filters.type}
                            onValueChange={(value) => handleFilterChange("type", value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPE_FILTER_OPTIONS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="From">
                        <DatePicker
                            value={filters.from}
                            onChange={(value) => handleFilterChange("from", value)}
                        />
                    </Field>

                    <Field label="To">
                        <DatePicker
                            value={filters.to}
                            onChange={(value) => handleFilterChange("to", value)}
                        />
                    </Field>

                    <Field label="Category">
                        <Input
                            placeholder="Any"
                            value={filters.category}
                            onChange={(e) => handleFilterChange("category", e.target.value)}
                        />
                    </Field>

                    {hasActiveFilters && onResetFilters && (
                        <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={onResetFilters}>
                                Reset filters
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-muted)]">
                    No transactions match the current filters.
                </div>
            ) : (
                <div className="mt-6">
                    <table className="w-full table-fixed divide-y divide-[var(--card-border)]">
                        <colgroup>
                            <col className="w-[10%]" />
                            <col className="w-[14%]" />
                            <col className="w-[10%]" />
                            <col className="w-[22%]" />
                            <col className="w-[28%]" />
                            <col className="w-[16%]" />
                        </colgroup>
                        <thead>
                            <tr className="bg-[var(--bg-main)] text-left text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-soft)]">
                                <th className="px-2 py-3">
                                    <button type="button" onClick={() => handleSort("date")}>
                                        Date {sortField === "date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                                <th className="px-2 py-3">Account</th>
                                <th className="px-2 py-3">Type</th>
                                <th className="px-2 py-3">Category</th>
                                <th className="px-2 py-3">Note</th>
                                <th className="px-2 py-3 text-right">
                                    <button type="button" onClick={() => handleSort("amount")}>
                                        Amount {sortField === "amount" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)] bg-[var(--card-bg-strong)]">
                            {transactions.map((tx) => (
                                <tr key={tx.transactionId || tx.rowKey || tx.id} className="text-sm align-top">
                                    <td className="px-2 py-4 text-[var(--text-muted)] whitespace-nowrap">
                                        {formatTransactionDate(tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc)}
                                    </td>
                                    <td className="px-2 py-4 text-[var(--text-main)] break-words">
                                        {accountNames?.[tx.accountId] || tx.accountName || tx.accountId}
                                    </td>
                                    <td className="px-2 py-4">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                                tx.type === "EXPENSE"
                                                    ? "bg-[var(--color-error-50)] text-[var(--color-error-700)]"
                                                    : "bg-[var(--color-success-50)] text-[var(--color-success-700)]"
                                            }`}
                                        >
                                            {tx.type === "EXPENSE" ? "Expense" : "Income"}
                                        </span>
                                    </td>
                                    <td className="px-2 py-4 text-[var(--text-muted)] break-words">
                                        {formatCategory(tx.category)}
                                    </td>
                                    <td className="px-2 py-4 text-[var(--text-muted)] break-words">{tx.note || "-"}</td>
                                    <td
                                        className={`px-2 py-4 text-right font-semibold whitespace-nowrap ${
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
