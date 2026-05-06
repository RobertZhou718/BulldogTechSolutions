import React, { useCallback, useEffect, useMemo, useState } from "react";
import TransactionFilters from "@/components/transactions/TransactionFilters.jsx";
import TransactionForm from "@/components/transactions/TransactionForm.jsx";
import TransactionTable from "@/components/transactions/TransactionTable.jsx";
import LatestReportCard from "@/components/reports/LatestReportCard.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrencyBreakdown, formatDateTime } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient";
import { Field } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function TransactionsPage() {
    const { getAccounts, getTransactions, createTransaction } = useApiClient();

    const [accounts, setAccounts] = useState([]);
    const [formAccountId, setFormAccountId] = useState("");
    const [historyAccountId, setHistoryAccountId] = useState("ALL");
    const [transactions, setTransactions] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);
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

        try {
            const data = await getTransactions(buildTransactionQueryParams());
            setTransactions(data || []);
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to load transactions.");
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
                }
            } catch (e) {
                console.error(e);
                toast.error(e.message || "Failed to load accounts.");
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
    const transactionSyncDescription = useMemo(() => {
        const scopedAccounts = historyAccountId === "ALL"
            ? accounts
            : accounts.filter((account) => account.accountId === historyAccountId);
        const plaidAccounts = scopedAccounts.filter((account) => account.externalSource === "Plaid");

        if (plaidAccounts.length === 0) {
            return "";
        }

        const timestamps = plaidAccounts
            .map((account) => new Date(account.lastTransactionSyncUtc).getTime())
            .filter((time) => Number.isFinite(time));

        if (timestamps.length === 0) {
            return "Plaid transaction sync pending.";
        }

        const oldestSync = new Date(Math.min(...timestamps)).toISOString();
        const failedCount = plaidAccounts.filter((account) => account.lastSyncStatus === "FAILED").length;
        const pendingCount = plaidAccounts.length - timestamps.length;
        const statusText = failedCount > 0
            ? ` ${failedCount} linked ${failedCount === 1 ? "account" : "accounts"} failed the latest daily sync.`
            : pendingCount > 0
              ? ` ${pendingCount} linked ${pendingCount === 1 ? "account is" : "accounts are"} pending first sync.`
              : "";

        return `Plaid transactions last synced ${formatDateTime(oldestSync)}.${statusText}`;
    }, [accounts, historyAccountId]);

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
            toast.success("Transaction added.");
            await loadTransactions();
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to create transaction.");
        }
    };

    if (loadingAccounts) {
        return (
            <div className="space-y-8">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-4 w-[28rem] max-w-full" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                    </div>
                </div>
                <div className="grid gap-6">
                    <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
                    <Skeleton className="h-16 rounded-[var(--radius-2xl)]" />
                    <Skeleton className="h-80 rounded-[var(--radius-2xl)]" />
                </div>
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
                description={`Add transactions, filter by date or type, and review account activity in one place.${transactionSyncDescription ? ` ${transactionSyncDescription}` : ""}`}
                actions={
                    <div className="min-w-[240px]">
                        <Field label="Viewing">
                            <Select
                                value={historyAccountId || "ALL"}
                                onValueChange={setHistoryAccountId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All accounts</SelectItem>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.accountId} value={acc.accountId}>
                                            {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
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
                    <div className="space-y-2">
                        <Skeleton className="h-10 rounded-[var(--radius-lg)]" />
                        <Skeleton className="h-10 rounded-[var(--radius-lg)]" />
                        <Skeleton className="h-10 rounded-[var(--radius-lg)]" />
                        <Skeleton className="h-10 rounded-[var(--radius-lg)]" />
                        <Skeleton className="h-10 rounded-[var(--radius-lg)]" />
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
