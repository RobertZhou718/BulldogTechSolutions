import React, { useEffect, useMemo, useState } from "react";
import TransactionFilters from "@/components/transactions/TransactionFilters.jsx";
import TransactionForm from "@/components/transactions/TransactionForm.jsx";
import TransactionTable from "@/components/transactions/TransactionTable.jsx";
import LatestReportCard from "@/components/reports/LatestReportCard.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrency } from "@/lib/utils";
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
        if (!historyAccountId) return;

        (async () => {
            setLoadingTx(true);
            setError("");
            try {
                const params = {};
                if (historyAccountId !== "ALL") params.accountId = historyAccountId;
                if (filters.from) params.from = new Date(`${filters.from}T00:00:00Z`).toISOString();
                if (filters.to) params.to = new Date(`${filters.to}T23:59:59Z`).toISOString();

                const data = await getTransactions(params);
                setTransactions(data || []);
            } catch (e) {
                console.error(e);
                setError(e.message || "Failed to load transactions.");
            } finally {
                setLoadingTx(false);
            }
        })();
    }, [historyAccountId, filters.from, filters.to, getTransactions]);

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
        const totals = visibleTransactions.reduce(
            (acc, tx) => {
                const amount = Number(tx.amount) || 0;
                if (tx.type === "EXPENSE") acc.expense += amount;
                else acc.income += amount;
                return acc;
            },
            { income: 0, expense: 0 }
        );

        return { ...totals, net: totals.income - totals.expense, count: visibleTransactions.length };
    }, [visibleTransactions]);

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

            const params = {};
            if (historyAccountId !== "ALL") params.accountId = historyAccountId;
            if (filters.from) params.from = new Date(`${filters.from}T00:00:00Z`).toISOString();
            if (filters.to) params.to = new Date(`${filters.to}T23:59:59Z`).toISOString();

            const data = await getTransactions(params);
            setTransactions(data || []);
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
                        value={formatCurrency(summary.net, currency, 0)}
                        tone={summary.net >= 0 ? "positive" : "negative"}
                    />
                    <MetricCard label="Inflows" value={formatCurrency(summary.income, currency, 0)} />
                    <MetricCard label="Outflows" value={formatCurrency(summary.expense, currency, 0)} />
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
