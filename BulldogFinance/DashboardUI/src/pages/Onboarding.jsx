import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConnectBankButton from "@/components/plaid/ConnectBankButton.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import { Field, Input } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiClient } from "@/services/apiClient";
import { formatCurrency } from "@/lib/utils";

const ACCOUNT_TYPES = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank account" },
    { value: "credit", label: "Credit card" },
    { value: "investment", label: "Investment" },
];

const CURRENCIES = ["CAD", "USD", "CNY", "EUR"];

export default function OnboardingPage() {
    const { getMe, postOnboarding, getAccounts } = useApiClient();
    const navigate = useNavigate();

    const [loadingMe, setLoadingMe] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [defaultCurrency, setDefaultCurrency] = useState("CAD");
    const [linkedAccounts, setLinkedAccounts] = useState([]);
    const [rows, setRows] = useState([
        { id: 1, name: "Cash", type: "cash", currency: "CAD", initialBalance: "" },
        { id: 2, name: "Chequing", type: "bank", currency: "CAD", initialBalance: "" },
    ]);

    useEffect(() => {
        (async () => {
            try {
                const me = await getMe();
                if (me?.onboardingDone) {
                    navigate("/dashboard", { replace: true });
                    return;
                }

                if (me?.defaultCurrency) {
                    setDefaultCurrency(me.defaultCurrency);
                    setRows((prev) => prev.map((row) => ({ ...row, currency: me.defaultCurrency })));
                }
            } catch (e) {
                console.error("Failed to load /me", e);
            } finally {
                setLoadingMe(false);
            }
        })();
    }, [getMe, navigate]);

    const totalInitial = useMemo(
        () =>
            rows.reduce((sum, row) => {
                const value = parseFloat(row.initialBalance || "0");
                return sum + (Number.isNaN(value) ? 0 : value);
            }, 0),
        [rows]
    );

    const handleRowChange = (id, field, value) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    };

    const handleAddRow = () => {
        const nextId = rows.length ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
        setRows((prev) => [
            ...prev,
            {
                id: nextId,
                name: "",
                type: "cash",
                currency: defaultCurrency,
                initialBalance: "",
            },
        ]);
    };

    const handleRemoveRow = (id) => {
        setRows((prev) => prev.filter((row) => row.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const cleanedAccounts = rows
                .map((row) => ({
                    name: (row.name || "").trim(),
                    type: row.type || "cash",
                    currency: row.currency || defaultCurrency,
                    initialBalance: parseFloat(row.initialBalance || "0") || 0,
                }))
                .filter((account) => account.name.length > 0);

            if (!cleanedAccounts.length && linkedAccounts.length === 0) {
                setError("Please connect a bank or enter at least one account.");
                setSaving(false);
                return;
            }

            await postOnboarding({ defaultCurrency, accounts: cleanedAccounts });
            navigate("/dashboard", { replace: true });
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to save onboarding information.");
        } finally {
            setSaving(false);
        }
    };

    const handlePlaidConnected = async () => {
        // Backend flips onboardingDone=true during /plaid/exchange-public-token,
        // so re-check /me and jump straight to the dashboard if the server has
        // already considered onboarding complete.
        try {
            const [accounts, me] = await Promise.all([
                getAccounts().catch(() => []),
                getMe().catch(() => null),
            ]);
            setLinkedAccounts(Array.isArray(accounts) ? accounts : []);
            if (me?.onboardingDone) {
                navigate("/dashboard", { replace: true });
            }
        } catch (e) {
            console.error("Failed to refresh onboarding state after Plaid link", e);
        }
    };

    if (loadingMe) {
        return (
            <div className="mx-auto max-w-5xl space-y-6 py-6">
                <Skeleton className="h-56 rounded-[var(--radius-2xl)]" />
                <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
                <Skeleton className="h-10 w-40 rounded-full" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl py-6">
            <Card>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                    Onboarding
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                    Welcome to Bulldog Finance
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)]">
                    Start by connecting a bank account with Plaid, or enter balances manually if you want to
                    onboard without bank access. You can add more accounts later.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                            Recommended
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                            Connect with Plaid
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            Import supported bank accounts, refresh balances, and start syncing transactions after
                            you grant permission.
                        </p>
                        <ConnectBankButton className="mt-4" onConnected={handlePlaidConnected} />
                    </div>

                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                            Manual
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                            Enter balances yourself
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            Useful if you do not want to connect a bank yet, or if your institution is not on Plaid.
                        </p>
                    </div>
                </div>

                {linkedAccounts.length > 0 ? (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)]">
                        <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr] gap-4 bg-[var(--bg-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)] md:grid">
                            <span>Account</span>
                            <span className="text-right">Balance</span>
                        </div>

                        <div className="divide-y divide-[var(--card-border)]">
                            {linkedAccounts.map((account) => (
                                <div
                                    key={account.accountId}
                                    className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,2.2fr)_1fr] md:items-center md:gap-4"
                                >
                                    <div>
                                        <p className="font-semibold text-[var(--text-main)]">
                                            {account.name}
                                        </p>
                                        {account.mask ? (
                                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                                •••• {account.mask}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="font-semibold text-[var(--text-main)]">
                                            {formatCurrency(
                                                account.currentBalance,
                                                account.currency,
                                                2
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                                            {account.currency}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-6 max-w-xs">
                    <Field label="Default currency">
                        <Select
                            value={defaultCurrency}
                            onValueChange={(value) => {
                                setDefaultCurrency(value);
                                setRows((prev) =>
                                    prev.map((row) => ({ ...row, currency: row.currency || value }))
                                );
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                        {currency}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 border-t border-[var(--card-border)] pt-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-[var(--text-main)]">Your accounts</h2>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                Add the balances you want the dashboard to start from if you are onboarding manually.
                            </p>
                        </div>
                        <Button variant="secondary" onClick={handleAddRow}>
                            Add another account
                        </Button>
                    </div>

                    <div className="mt-6 space-y-4">
                        {rows.map((row) => (
                            <div
                                key={row.id}
                                className="grid gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] p-4 md:grid-cols-[minmax(0,2fr)_1.25fr_0.9fr_1fr_auto]"
                            >
                                <Field label="Account name">
                                    <Input
                                        value={row.name}
                                        onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                                    />
                                </Field>

                                <Field label="Type">
                                    <Select
                                        value={row.type}
                                        onValueChange={(value) => handleRowChange(row.id, "type", value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACCOUNT_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Currency">
                                    <Select
                                        value={row.currency || defaultCurrency}
                                        onValueChange={(value) => handleRowChange(row.id, "currency", value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map((currency) => (
                                                <SelectItem key={currency} value={currency}>
                                                    {currency}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Initial balance">
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-input px-3 text-sm text-muted-foreground">
                                            {row.currency || defaultCurrency}
                                        </span>
                                        <Input
                                            type="number"
                                            value={row.initialBalance}
                                            onChange={(e) =>
                                                handleRowChange(row.id, "initialBalance", e.target.value)
                                            }
                                            className="pl-16"
                                        />
                                    </div>
                                </Field>

                                <div className="flex items-end">
                                    <Button
                                        variant="ghost"
                                        className="w-full md:w-auto"
                                        onClick={() => handleRemoveRow(row.id)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-4 border-t border-[var(--card-border)] pt-6 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-[var(--text-muted)]">
                            Total initial balance: {defaultCurrency}{" "}
                            {totalInitial.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>

                        <div className="flex items-center gap-3">
                            {error ? (
                                <p className="text-sm font-medium text-[var(--color-error-500)]">{error}</p>
                            ) : null}
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving..." : "Save and continue"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>
        </div>
    );
}
