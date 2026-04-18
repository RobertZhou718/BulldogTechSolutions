import React, { useState } from "react";
import Button from "@/components/ui/Button.jsx";
import Card from "@/components/ui/Card.jsx";
import { Field, Input, Select } from "@/components/ui/Field.jsx";

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
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const accountId = selectedAccountId || accounts[0]?.accountId || "";

    const currentAccount = accounts.find((a) => a.accountId === accountId);
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
            occurredAtUtc: new Date(`${date}T00:00:00Z`).toISOString(),
            currency,
        });

        setAmount("");
        setNote("");
    };

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                Create
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                Add a transaction
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Capture income and expenses against any linked account.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Account" className="xl:col-span-2">
                    <Select
                        value={accountId}
                        onChange={(e) => onAccountChange?.(e.target.value)}
                    >
                        {accounts.map((acc) => (
                            <option key={acc.accountId} value={acc.accountId}>
                                {acc.name}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Type">
                    <Select value={type} onChange={(e) => setType(e.target.value)}>
                        {TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Date">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>

                <Field label="Amount">
                    <div className="flex overflow-hidden rounded-xl border border-[var(--card-border)] bg-white shadow-xs">
                        <span className="flex items-center border-r border-[var(--card-border)] px-3 text-sm text-[var(--text-soft)]">
                            {currency}
                        </span>
                        <input
                            className="w-full px-3.5 py-2.5 text-sm outline-none"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                </Field>

                <Field label="Category">
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                        {DEFAULT_CATEGORIES.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Note" className="md:col-span-2 xl:col-span-2">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>

                <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                    <Button type="submit">Save transaction</Button>
                </div>
            </form>
        </Card>
    );
}
