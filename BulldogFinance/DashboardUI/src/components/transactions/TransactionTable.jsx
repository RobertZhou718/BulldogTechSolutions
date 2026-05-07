import React, { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { isConnectedAccount, isConnectedTransaction } from "@/lib/accountSources.js";
import {
    formatTransactionDate,
    getTransactionDateKey,
    transactionDateToUtcIso,
} from "@/lib/transactionDates.js";

const TYPE_FILTER_OPTIONS = [
    { value: "ALL", label: "All" },
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

const TYPE_EDIT_OPTIONS = [
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

const EMPTY_EDIT_FORM = {
    type: "EXPENSE",
    date: "",
    amount: "",
    category: "",
    merchantName: "",
    note: "",
};

function getTransactionId(tx) {
    return tx.transactionId || tx.rowKey || tx.id;
}

function buildEditForm(tx) {
    return {
        type: tx.type === "INCOME" ? "INCOME" : "EXPENSE",
        date: getTransactionDateKey(tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc),
        amount: tx.amount?.toString() || "",
        category: tx.category || "",
        merchantName: tx.merchantName || "",
        note: tx.note || "",
    };
}

function formatCategory(raw) {
    if (!raw) return "-";
    return raw
        .toString()
        .toLowerCase()
        .split("_")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
}

function getTypeMeta(type) {
    if (type === "EXPENSE") {
        return {
            label: "Expense",
            className: "bg-[var(--color-error-50)] text-[var(--color-error-700)]",
            sign: "-",
            amountClassName: "text-[var(--color-error-700)]",
        };
    }

    if (type === "INCOME") {
        return {
            label: "Income",
            className: "bg-[var(--color-success-50)] text-[var(--color-success-700)]",
            sign: "+",
            amountClassName: "text-[var(--color-success-700)]",
        };
    }

    return {
        label: "Initial",
        className: "bg-secondary text-secondary-foreground",
        sign: "",
        amountClassName: "text-[var(--text-main)]",
    };
}

export default function TransactionTable({
    transactions,
    accounts = [],
    accountNames,
    sortField,
    sortDirection,
    onSortChange,
    filters,
    onFiltersChange,
    onResetFilters,
    onUpdateTransaction,
    onDeleteTransaction,
}) {
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
    const [deleteTransaction, setDeleteTransaction] = useState(null);
    const [saving, setSaving] = useState(false);

    const accountById = useMemo(
        () =>
            accounts.reduce((map, account) => {
                map[account.accountId] = account;
                return map;
            }, {}),
        [accounts]
    );

    const editingAccount = editingTransaction
        ? accountById[editingTransaction.accountId]
        : null;
    const editingConnected = editingTransaction
        ? isConnectedTransaction(editingTransaction, editingAccount)
        : false;

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

    const canEdit = (tx) => {
        const account = accountById[tx.accountId];
        return (
            isConnectedTransaction(tx, account) ||
            (!tx.isSystemGenerated && !isConnectedAccount(account))
        );
    };

    const canDelete = (tx) => {
        const account = accountById[tx.accountId];
        return !tx.isSystemGenerated && !isConnectedTransaction(tx, account);
    };

    const openEdit = (tx) => {
        setEditingTransaction(tx);
        setEditForm(buildEditForm(tx));
    };

    const closeEdit = () => {
        if (!saving) {
            setEditingTransaction(null);
            setEditForm(EMPTY_EDIT_FORM);
        }
    };

    const updateEditField = (field, value) => {
        setEditForm((current) => ({ ...current, [field]: value }));
    };

    const submitEdit = async (event) => {
        event.preventDefault();
        if (!editingTransaction || !onUpdateTransaction) return;

        const transactionId = getTransactionId(editingTransaction);
        if (!transactionId) return;

        const payload = editingConnected
            ? {
                  category: editForm.category.trim(),
                  merchantName: editForm.merchantName.trim(),
                  note: editForm.note.trim(),
              }
            : {
                  type: editForm.type,
                  amount: parseFloat(editForm.amount),
                  occurredAtUtc: transactionDateToUtcIso(editForm.date),
                  category: editForm.category.trim(),
                  merchantName: editForm.merchantName.trim(),
                  note: editForm.note.trim(),
              };

        if (!editingConnected && (!payload.occurredAtUtc || Number.isNaN(payload.amount) || payload.amount <= 0)) {
            return;
        }

        setSaving(true);
        try {
            await onUpdateTransaction(transactionId, payload);
            setEditingTransaction(null);
            setEditForm(EMPTY_EDIT_FORM);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        const transactionId = deleteTransaction ? getTransactionId(deleteTransaction) : "";
        if (!transactionId || !onDeleteTransaction) return;

        setSaving(true);
        try {
            await onDeleteTransaction(transactionId);
            setDeleteTransaction(null);
        } finally {
            setSaving(false);
        }
    };

    return (
        <TooltipProvider>
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
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full min-w-[920px] table-fixed divide-y divide-[var(--card-border)]">
                            <colgroup>
                                <col className="w-[9%]" />
                                <col className="w-[13%]" />
                                <col className="w-[9%]" />
                                <col className="w-[18%]" />
                                <col className="w-[22%]" />
                                <col className="w-[14%]" />
                                <col className="w-[15%]" />
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
                                    <th className="px-2 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)] bg-[var(--card-bg-strong)]">
                                {transactions.map((tx) => {
                                    const typeMeta = getTypeMeta(tx.type);
                                    const transactionId = getTransactionId(tx);
                                    const showEdit = canEdit(tx);
                                    const showDelete = canDelete(tx);

                                    return (
                                        <tr key={transactionId} className="text-sm align-top">
                                            <td className="px-2 py-4 text-[var(--text-muted)] whitespace-nowrap">
                                                {formatTransactionDate(tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc)}
                                            </td>
                                            <td className="px-2 py-4 text-[var(--text-main)] break-words">
                                                {accountNames?.[tx.accountId] || tx.accountName || tx.accountId}
                                            </td>
                                            <td className="px-2 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeMeta.className}`}
                                                >
                                                    {typeMeta.label}
                                                </span>
                                            </td>
                                            <td className="px-2 py-4 text-[var(--text-muted)] break-words">
                                                {formatCategory(tx.category)}
                                            </td>
                                            <td className="px-2 py-4 text-[var(--text-muted)] break-words">{tx.note || "-"}</td>
                                            <td
                                                className={`px-2 py-4 text-right font-semibold whitespace-nowrap ${typeMeta.amountClassName}`}
                                            >
                                                {typeMeta.sign ? `${typeMeta.sign} ` : ""}{renderAmount(tx)}
                                            </td>
                                            <td className="px-2 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {showEdit && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    aria-label="Edit transaction"
                                                                    onClick={() => openEdit(tx)}
                                                                >
                                                                    <Pencil className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    {showDelete && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    aria-label="Delete transaction"
                                                                    onClick={() => setDeleteTransaction(tx)}
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Delete</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog
                open={Boolean(editingTransaction)}
                onOpenChange={(open) => {
                    if (!open) closeEdit();
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <form onSubmit={submitEdit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>Edit transaction</DialogTitle>
                            <DialogDescription>
                                {editingConnected
                                    ? "Bank-synced transactions allow metadata changes only."
                                    : "Update this manually entered transaction."}
                            </DialogDescription>
                        </DialogHeader>

                        {!editingConnected && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Field label="Type">
                                    <Select
                                        value={editForm.type}
                                        onValueChange={(value) => updateEditField("type", value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPE_EDIT_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Date">
                                    <DatePicker
                                        value={editForm.date}
                                        onChange={(value) => updateEditField("date", value)}
                                    />
                                </Field>

                                <Field label="Amount">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editForm.amount}
                                        onChange={(e) => updateEditField("amount", e.target.value)}
                                    />
                                </Field>
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Category">
                                <Input
                                    value={editForm.category}
                                    onChange={(e) => updateEditField("category", e.target.value)}
                                />
                            </Field>

                            <Field label="Merchant">
                                <Input
                                    value={editForm.merchantName}
                                    onChange={(e) => updateEditField("merchantName", e.target.value)}
                                />
                            </Field>
                        </div>

                        <Field label="Note">
                            <Textarea
                                value={editForm.note}
                                onChange={(e) => updateEditField("note", e.target.value)}
                            />
                        </Field>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={closeEdit} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={saving} loadingText="Saving...">
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(deleteTransaction)}
                onOpenChange={(open) => {
                    if (!open && !saving) setDeleteTransaction(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete transaction?</DialogTitle>
                        <DialogDescription>
                            This will remove the manual transaction and update the account balance.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setDeleteTransaction(null)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
                            loading={saving}
                            loadingText="Deleting..."
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
