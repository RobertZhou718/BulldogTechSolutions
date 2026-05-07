import React, { useCallback, useEffect, useMemo, useState } from "react";
import TransactionForm from "@/components/transactions/TransactionForm.jsx";
import TransactionTable from "@/components/transactions/TransactionTable.jsx";
import LatestReportCard from "@/components/reports/LatestReportCard.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { isManualAccount } from "@/lib/accountSources.js";
import { getTransactionTimestamp, transactionDateToUtcIso } from "@/lib/transactionDates.js";
import { useApiClient } from "@/services/apiClient";
import { Field } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const TRANSACTION_PAGE_SIZE = 50;

export default function TransactionsPage() {
    const {
        getAccounts,
        getTransactions,
        createTransaction,
        updateTransaction,
        deleteTransaction,
    } = useApiClient();

    const [accounts, setAccounts] = useState([]);
    const [formAccountId, setFormAccountId] = useState("");
    const [historyAccountId, setHistoryAccountId] = useState("ALL");
    const [transactions, setTransactions] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);
    const [loadingMoreTx, setLoadingMoreTx] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
    const [filters, setFilters] = useState({ type: "ALL", from: "", to: "", category: "" });
    const [sortField, setSortField] = useState("date");
    const [sortDirection, setSortDirection] = useState("desc");
    const manualAccounts = useMemo(() => accounts.filter(isManualAccount), [accounts]);

    const loadAccounts = useCallback(async () => {
        const data = await getAccounts();
        const accountList = data || [];
        const manualAccountList = accountList.filter(isManualAccount);

        setAccounts(accountList);
        setFormAccountId((current) => {
            if (manualAccountList.some((account) => account.accountId === current)) {
                return current;
            }

            return manualAccountList[0]?.accountId || "";
        });
    }, [getAccounts]);

    const buildTransactionQueryParams = useCallback(() => {
        const params = {};

        if (historyAccountId !== "ALL") {
            params.accountId = historyAccountId;
        }

        if (filters.from) {
            params.from = transactionDateToUtcIso(filters.from);
        }

        if (filters.to) {
            params.to = transactionDateToUtcIso(filters.to, true);
        }

        if (filters.type && filters.type !== "ALL") {
            params.type = filters.type;
        }

        if (filters.category) {
            params.category = filters.category.trim();
        }

        return params;
    }, [filters.category, filters.from, filters.to, filters.type, historyAccountId]);
    const loadTransactions = useCallback(async ({ append = false, cursor = null } = {}) => {
        if (!historyAccountId) {
            return;
        }

        if (append) {
            setLoadingMoreTx(true);
        } else {
            setLoadingTx(true);
            setNextCursor(null);
            setHasMoreTransactions(false);
        }

        try {
            const data = await getTransactions({
                ...buildTransactionQueryParams(),
                limit: TRANSACTION_PAGE_SIZE,
                cursor,
            });
            const items = data?.items || [];
            setTransactions((current) => (append ? [...current, ...items] : items));
            setNextCursor(data?.nextCursor || null);
            setHasMoreTransactions(Boolean(data?.hasMore));
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to load transactions.");
        } finally {
            if (append) {
                setLoadingMoreTx(false);
            } else {
                setLoadingTx(false);
            }
        }
    }, [buildTransactionQueryParams, getTransactions, historyAccountId]);

    useEffect(() => {
        (async () => {
            try {
                await loadAccounts();
            } catch (e) {
                console.error(e);
                toast.error(e.message || "Failed to load accounts.");
            } finally {
                setLoadingAccounts(false);
            }
        })();
    }, [loadAccounts]);

    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

    const visibleTransactions = useMemo(() => {
        let list = [...transactions];

        list.sort((a, b) => {
            if (sortField === "amount") {
                const av = a.amount ?? 0;
                const bv = b.amount ?? 0;
                return sortDirection === "asc" ? av - bv : bv - av;
            }

            const ad = getTransactionTimestamp(a.occurredAtUtc || a.occurredAt || a.createdAtUtc);
            const bd = getTransactionTimestamp(b.occurredAtUtc || b.occurredAt || b.createdAtUtc);
            return sortDirection === "asc" ? ad - bd : bd - ad;
        });

        return list;
    }, [transactions, sortField, sortDirection]);

    const loadMoreTransactions = useCallback(() => {
        if (!hasMoreTransactions || !nextCursor || loadingMoreTx) {
            return;
        }

        void loadTransactions({ append: true, cursor: nextCursor });
    }, [hasMoreTransactions, loadTransactions, loadingMoreTx, nextCursor]);

    const viewAccount = useMemo(
        () => accounts.find((a) => a.accountId === historyAccountId),
        [accounts, historyAccountId]
    );
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
            await Promise.all([loadAccounts(), loadTransactions()]);
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to create transaction.");
        }
    };

    const handleUpdateTransaction = async (transactionId, payload) => {
        try {
            await updateTransaction(transactionId, payload);
            toast.success("Transaction updated.");
            await Promise.all([loadAccounts(), loadTransactions()]);
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to update transaction.");
            throw e;
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        try {
            await deleteTransaction(transactionId);
            toast.success("Transaction deleted.");
            await Promise.all([loadAccounts(), loadTransactions()]);
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Failed to delete transaction.");
            throw e;
        }
    };

    if (loadingAccounts) {
        return (
            <div className="space-y-8">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-4 w-[28rem] max-w-full" />
                </div>
                <div className="grid grid-cols-1 gap-6">
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
            />

            <div className="grid grid-cols-1 gap-6">
                <LatestReportCard />

                <TransactionForm
                    accounts={manualAccounts}
                    selectedAccountId={formAccountId}
                    onAccountChange={setFormAccountId}
                    onSubmit={handleCreateTransaction}
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
                        accounts={accounts}
                        accountNames={accountNameMap}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortChange={(field, direction) => {
                            setSortField(field);
                            setSortDirection(direction);
                        }}
                        filters={filters}
                        onFiltersChange={setFilters}
                        onResetFilters={() => setFilters({ type: "ALL", from: "", to: "", category: "" })}
                        onUpdateTransaction={handleUpdateTransaction}
                        onDeleteTransaction={handleDeleteTransaction}
                        hasMore={hasMoreTransactions}
                        loadingMore={loadingMoreTx}
                        onLoadMore={loadMoreTransactions}
                    />
                )}
            </div>
        </div>
    );
}
