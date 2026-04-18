import React, { useCallback, useEffect, useMemo, useState } from "react";
import TransactionFilters from "@/components/transactions/TransactionFilters.jsx";
import TransactionForm from "@/components/transactions/TransactionForm.jsx";
import TransactionTable from "@/components/transactions/TransactionTable.jsx";
import LatestReportCard from "@/components/reports/LatestReportCard.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrencyBreakdown } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient";
import { Field, Select } from "@/components/ui/Field.jsx";

export default function TransactionsPage() {
    const { getAccounts, getTransactions, createTransaction } = useApiClient();

    const [accounts, setAccounts] = useState([]);
    const [formAccountId, setFormAccountId] = useState("");
    const [historyAccountId, setHistoryAccountId] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({ type: "ALL", from: "", to: "", category: "" });
    const [sortField, setSortField] = useState("date");
    const [sortDirection, setSortDirection] = useState("desc");
    const buildTransactionQueryParams = useCallback(() => {
        const params = {};

        if (historyAccountId !== "ALL") {
            params.accountId = historyAccountId;
        }

        if (filters.from) {
            params.from = new Date(`${filters.from}T00:00:00Z`).toISOString();
        }

        if (filters.to) {
            params.to = new Date(`${filters.to}T23:59:59Z`).toISOString();
        }

        return params;
    }, [filters.from, filters.to, historyAccountId]);
    const loadTransactions = useCallback(async () => {
        if (!historyAccountId) {
            return;
        }

        setLoadingTx(true);
        setError("");

        try {
            const data = await getTransactions(buildTransactionQueryParams());
            setTransactions(data || []);
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to load transactions.");
        } finally {
            setLoadingTx(false);
        }
    }, [buildTransactionQueryParams, getTransactions, historyAccountId]);

    useEffect(() => {
        (async () => {
            try {
                const data = await getAccounts();
                setAccounts(data || []);
                if (data?.length) {
                    setFormAccountId(data[0].accountId);
                    setHistoryAccountId(data[0].accountId);
                }
            } catch (e) {
                console.error(e);
                setError(e.message || "Failed to load accounts.");
            } finally {
                setLoadingAccounts(false);
            }
        })();
    }, [getAccounts]);

    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

    const visibleTransactions = useMemo(() => {
        let list = [...transactions];

        if (filters.type !== "ALL") list = list.filter((tx) => tx.type === filters.type);
        if (filters.category) {
            const keyword = filters.category.toLowerCase();
            list = list.filter((tx) => (tx.category || "").toLowerCase().includes(keyword));
        }

        list.sort((a, b) => {
            if (sortField === "amount") {
                const av = a.amount ?? 0;
                const bv = b.amount ?? 0;
                return sortDirection === "asc" ? av - bv : bv - av;
            }

            const ad = new Date(a.occurredAtUtc || a.occurredAt || a.createdAtUtc || 0).getTime();
            const bd = new Date(b.occurredAtUtc || b.occurredAt || b.createdAtUtc || 0).getTime();
            return sortDirection === "asc" ? ad - bd : bd - ad;
        });

        return list;
    }, [transactions, filters.type, filters.category, sortField, sortDirection]);

    const viewAccount = useMemo(
        () => accounts.find((a) => a.accountId === historyAccountId),
        [accounts, historyAccountId]
    );
    const formAccount = useMemo(
        () => accounts.find((a) => a.accountId === formAccountId),
        [accounts, formAccountId]
    );
    const currency = viewAccount?.currency || formAccount?.currency || "CAD";

    const summary = useMemo(() => {
        const totalsByCurrency = new Map();

        visibleTransactions.forEach((tx) => {
            const transactionCurrency = tx.currency || currency || "CAD";
            const existing = totalsByCurrency.get(transactionCurrency) || { income: 0, expense: 0 };
            const amount = Number(tx.amount) || 0;

            if (tx.type === "EXPENSE") {
                existing.expense += amount;
            } else {
                existing.income += amount;
            }

            totalsByCurrency.set(transactionCurrency, existing);
        });

        const totals = Array.from(totalsByCurrency, ([entryCurrency, values]) => ({
            currency: entryCurrency,
            income: values.income,
            expense: values.expense,
            net: values.income - values.expense,
        }));

        return { totals, count: visibleTransactions.length };
    }, [currency, visibleTransactions]);
    const hasMixedSummaryCurrencies = summary.totals.length > 1;
    const netFlowLabel = useMemo(
        () => formatCurrencyBreakdown(summary.totals.map(({ currency: entryCurrency, net }) => ({ currency: entryCurrency, amount: net })), 0),
        [summary.totals]
    );
    const incomeLabel = useMemo(
        () => formatCurrencyBreakdown(summary.totals.map(({ currency: entryCurrency, income }) => ({ currency: entryCurrency, amount: income })), 0),
        [summary.totals]
    );
    const expenseLabel = useMemo(
        () => formatCurrencyBreakdown(summary.totals.map(({ currency: entryCurrency, expense }) => ({ currency: entryCurrency, amount: expense })), 0),
        [summary.totals]
    );
    const primaryNetTotal = summary.totals[0]?.net ?? 0;

    const accountNameMap = useMemo(
        () =>
            accounts.reduce((map, acc) => {
                map[acc.accountId] = acc.name;
                return map;
            }, {}),
        [accounts]
    );

    const handleCreateTransaction = async (txInput) => {
        try {
            await createTransaction(txInput);
            await loadTransactions();
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to create transaction.");
        }
    };

    if (loadingAccounts) {
        return (
            <div className="mt-12 flex justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    if (!accounts.length) {
        return (
            <EmptyState
                title="No accounts found"
                description="Complete onboarding and create at least one account before managing transactions."
            />
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Transactions"
                title={historyAccountId === "ALL" ? "All accounts" : viewAccount?.name || "Selected account"}
                description="Add transactions, filter by date or type, and review account activity in one place."
                actions={
                    <div className="min-w-[240px]">
                        <Field label="Viewing">
                            <Select
                                value={historyAccountId || ""}
                                onChange={(e) => setHistoryAccountId(e.target.value)}
                            >
                                <option value="ALL">All accounts</option>
                                {accounts.map((acc) => (
                                    <option key={acc.accountId} value={acc.accountId}>
                                        {acc.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                }
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Net flow"
                        value={netFlowLabel}
                        tone={hasMixedSummaryCurrencies ? "default" : (primaryNetTotal >= 0 ? "positive" : "negative")}
                        hint={hasMixedSummaryCurrencies ? "Grouped by currency; no FX conversion applied" : undefined}
                    />
                    <MetricCard label="Inflows" value={incomeLabel} />
                    <MetricCard label="Outflows" value={expenseLabel} />
                    <MetricCard label="Items shown" value={summary.count} />
                </div>
            </PageHeader>

            {error ? <p className="text-sm font-medium text-[var(--color-error-500)]">{error}</p> : null}

            <div className="grid gap-6">
                <LatestReportCard />

                <TransactionForm
                    accounts={accounts}
                    selectedAccountId={formAccountId}
                    onAccountChange={setFormAccountId}
                    onSubmit={handleCreateTransaction}
                />

                <TransactionFilters
                    filters={filters}
                    onChange={setFilters}
                    onReset={() => setFilters({ type: "ALL", from: "", to: "", category: "" })}
                />

                {loadingTx ? (
                    <div className="flex justify-center py-8">
                        <Spinner className="h-7 w-7" />
                    </div>
                ) : (
                    <TransactionTable
                        transactions={visibleTransactions}
                        accountNames={accountNameMap}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortChange={(field, direction) => {
                            setSortField(field);
                            setSortDirection(direction);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
