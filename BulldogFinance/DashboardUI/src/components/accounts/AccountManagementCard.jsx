import React, { useMemo, useState } from "react";
import ConnectBankButton from "@/components/plaid/ConnectBankButton.jsx";
import Button from "@/components/ui/Button.jsx";
import Card from "@/components/ui/Card.jsx";
import { Field, Input, Select } from "@/components/ui/Field.jsx";

const ACCOUNT_TYPES = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank account" },
    { value: "credit", label: "Credit card" },
    { value: "investment", label: "Investment" },
];

const CURRENCIES = ["CAD", "USD", "CNY", "EUR"];

export default function AccountManagementCard({
    accounts,
    defaultCurrency = "CAD",
    onCreateManualAccount,
    onPlaidConnected,
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        type: "cash",
        currency: defaultCurrency,
        initialBalance: "",
    });

    const nextDefaultCurrency = useMemo(
        () => form.currency || defaultCurrency,
        [defaultCurrency, form.currency]
    );

    const handleChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!form.name.trim()) {
            setError("Account name is required.");
            return;
        }

        try {
            setSaving(true);
            await onCreateManualAccount({
                name: form.name.trim(),
                type: form.type,
                currency: form.currency || defaultCurrency,
                initialBalance: parseFloat(form.initialBalance || "0") || 0,
            });

            setForm({
                name: "",
                type: "cash",
                currency: defaultCurrency,
                initialBalance: "",
            });
        } catch (e) {
            setError(e.message || "Failed to add account.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="xl:col-span-12">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                        Account management
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                        Add accounts after onboarding
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        You can keep adding manual accounts or connect more banks with Plaid at any time.
                        Current total: {accounts.length} {accounts.length === 1 ? "account" : "accounts"}.
                    </p>
                </div>

                <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] p-4">
                    <p className="text-sm font-semibold text-[var(--text-main)]">Connect another bank</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Link one or more additional institutions without redoing onboarding.
                    </p>
                    <ConnectBankButton className="mt-4" onConnected={onPlaidConnected} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 border-t border-[var(--card-border)] pt-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1.2fr_1fr_1fr_auto]">
                    <Field label="Account name">
                        <Input
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Emergency fund"
                        />
                    </Field>

                    <Field label="Type">
                        <Select
                            value={form.type}
                            onChange={(e) => handleChange("type", e.target.value)}
                        >
                            {ACCOUNT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Currency">
                        <Select
                            value={nextDefaultCurrency}
                            onChange={(e) => handleChange("currency", e.target.value)}
                        >
                            {CURRENCIES.map((currency) => (
                                <option key={currency} value={currency}>
                                    {currency}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field label="Initial balance">
                        <Input
                            type="number"
                            value={form.initialBalance}
                            onChange={(e) => handleChange("initialBalance", e.target.value)}
                            placeholder="0.00"
                        />
                    </Field>

                    <div className="flex items-end">
                        <Button type="submit" disabled={saving}>
                            {saving ? "Adding..." : "Add account"}
                        </Button>
                    </div>
                </div>

                {error ? (
                    <p className="mt-4 text-sm font-medium text-[var(--color-error-500)]">{error}</p>
                ) : null}
            </form>
        </Card>
    );
}
