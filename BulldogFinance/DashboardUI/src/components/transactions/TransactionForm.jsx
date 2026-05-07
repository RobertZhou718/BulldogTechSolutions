import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { isManualAccount } from "@/lib/accountSources.js";
import { getLocalDateInputValue, transactionDateToUtcIso } from "@/lib/transactionDates.js";

const TYPE_OPTIONS = [
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

const DEFAULT_CATEGORIES = [
    "General",
    "Food",
    "Groceries",
    "Rent",
    "Salary",
    "Investment",
    "Transport",
];

export default function TransactionForm({
    accounts,
    selectedAccountId,
    onAccountChange,
    onSubmit,
}) {
    const [type, setType] = useState("EXPENSE");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("General");
    const [note, setNote] = useState("");
    const [date, setDate] = useState(() => getLocalDateInputValue());
    const manualAccounts = accounts.filter(isManualAccount);
    const accountId = manualAccounts.some((account) => account.accountId === selectedAccountId)
        ? selectedAccountId
        : manualAccounts[0]?.accountId || "";

    const currentAccount = manualAccounts.find((a) => a.accountId === accountId);
    const currency = currentAccount?.currency || "CAD";

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!accountId || !amount) return;

        const numericAmount = parseFloat(amount);
        if (Number.isNaN(numericAmount) || numericAmount <= 0) return;

        onSubmit({
            accountId,
            type,
            amount: numericAmount,
            category,
            note: note.trim(),
            occurredAtUtc: transactionDateToUtcIso(date),
            currency,
        });

        setAmount("");
        setNote("");
    };

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Create
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                Add a transaction
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Capture income and expenses against manual accounts.
            </p>

            {manualAccounts.length === 0 ? (
                <div className="mt-6 rounded-md border border-dashed border-[var(--card-border)] px-4 py-6 text-sm text-[var(--text-muted)]">
                    Manual transaction creation is available after adding a manual account.
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Account" className="xl:col-span-2">
                        <Select
                            value={accountId}
                            onValueChange={(value) => onAccountChange?.(value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {manualAccounts.map((acc) => (
                                    <SelectItem key={acc.accountId} value={acc.accountId}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Type">
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TYPE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Date">
                        <DatePicker value={date} onChange={setDate} />
                    </Field>

                    <Field label="Amount">
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-input px-3 text-sm text-muted-foreground">
                                {currency}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-16"
                            />
                        </div>
                    </Field>

                    <Field label="Category">
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DEFAULT_CATEGORIES.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="Note" className="md:col-span-2 xl:col-span-2">
                        <Input value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>

                    <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                        <Button type="submit">Save transaction</Button>
                    </div>
                </form>
            )}
        </Card>
    );
}
