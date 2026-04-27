import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConnectedAccountsCard from "@/components/accounts/ConnectedAccountsCard.jsx";
import { useAuth } from "@/auth/core/authContext.js";
import AccountsPieChart from "@/components/dashboard/AccountsPieChart.jsx";
import CashFlowChart from "@/components/dashboard/CashFlowChart.jsx";
import DailyCashFlowCalendar from "@/components/dashboard/DailyCashFlowCalendar.jsx";
import InvestmentsChart from "@/components/dashboard/InvestmentsChart.jsx";
import SavingsGoalCard from "@/components/savings/SavingsGoalCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyBreakdown } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient.js";
import { toast } from "sonner";

const CASH_FLOW_PALETTE = [
    { income: "#12b76a", expense: "#1570ef" },
    { income: "#f79009", expense: "#93370d" },
    { income: "#7a5af8", expense: "#5925dc" },
    { income: "#36bffa", expense: "#026aa2" },
];

export default function DashboardPage() {
    const {
        getAccounts,
        getTransactions,
        getInvestmentOverview,
        getActiveSavingsGoal,
        createSavingsGoal,
        updateSavingsGoal,
        archiveSavingsGoal,
        createAccount,
        deleteAccount,
    } = useApiClient();
    const { user } = useAuth();

    const displayName = user?.givenName || user?.name || user?.username || "Friend";
    const defaultCurrency = "CAD";

    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [overview, setOverview] = useState(null);
    const [savingsGoal, setSavingsGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const loadDashboard = useCallback(async () => {
        const end = new Date();
        const start = new Date(end);
        start.setMonth(end.getMonth() - 5);
        start.setDate(1);

        const [accountsData, transactionsData, overviewData, savingsGoalData] = await Promise.all([
            getAccounts(),
            getTransactions({
                from: start.toISOString(),
                to: end.toISOString(),
            }),
            getInvestmentOverview(),
            getActiveSavingsGoal(),
        ]);

        setAccounts(accountsData || []);
        setTransactions(transactionsData || []);
        setOverview(overviewData || null);
        setSavingsGoal(savingsGoalData || null);
    }, [getAccounts, getActiveSavingsGoal, getInvestmentOverview, getTransactions]);

    useEffect(() => {
        (async () => {
            try {
                await loadDashboard();
            } catch (e) {
                console.error(e);
                setLoadError(e.message ?? "Failed to load accounts");
            } finally {
                setLoading(false);
            }
        })();
    }, [loadDashboard]);

    const refreshDashboard = async () => {
        setLoadError(null);
        await loadDashboard();
    };

    const handleCreateManualAccount = async (payload) => {
        try {
            await createAccount(payload);
            toast.success("Account created.");
            await refreshDashboard();
        } catch (e) {
            toast.error(e.message || "Failed to create account.");
            throw e;
        }
    };

    const handlePlaidConnected = async () => {
        toast.success("Bank connected.");
        await refreshDashboard();
    };

    const handleDeleteAccount = async (accountId) => {
        try {
            await deleteAccount(accountId);
            toast.success("Account removed.");
            await refreshDashboard();
        } catch (e) {
            toast.error(e.message || "Failed to remove account.");
            throw e;
        }
    };

    const handleCreateSavingsGoal = async (payload) => {
        try {
            await createSavingsGoal(payload);
            toast.success("Savings goal created.");
            await refreshDashboard();
        } catch (e) {
            toast.error(e.message || "Failed to create savings goal.");
            throw e;
        }
    };

    const handleUpdateSavingsGoal = async (goalId, payload) => {
        try {
            await updateSavingsGoal(goalId, payload);
            toast.success("Savings goal updated.");
            await refreshDashboard();
        } catch (e) {
            toast.error(e.message || "Failed to update savings goal.");
            throw e;
        }
    };

    const handleArchiveSavingsGoal = async (goalId) => {
        try {
            await archiveSavingsGoal(goalId);
            toast.success("Savings goal archived.");
            await refreshDashboard();
        } catch (e) {
            toast.error(e.message || "Failed to archive savings goal.");
            throw e;
        }
    };

    const cashFlowData = useMemo(() => {
        const months = Array.from({ length: 6 }, (_, index) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - index));
            date.setDate(1);
            return {
                key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
                label: date.toLocaleString("en-US", { month: "short" }),
                income: 0,
                expense: 0,
            };
        });
        const emptyMonths = months.map((month) => ({ ...month }));
        const monthMapsByCurrency = new Map();

        transactions.forEach((tx) => {
            const occurredAt = tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc;
            if (!occurredAt) return;

            const date = new Date(occurredAt);
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
            const currency = tx.currency || defaultCurrency;

            if (!monthMapsByCurrency.has(currency)) {
                monthMapsByCurrency.set(
                    currency,
                    emptyMonths.reduce((map, month) => {
                        map[month.key] = { ...month };
                        return map;
                    }, {})
                );
            }

            const bucket = monthMapsByCurrency.get(currency)?.[key];
            if (!bucket) return;

            const amount = Number(tx.amount) || 0;
            if (tx.type === "EXPENSE") {
                bucket.expense += amount;
            } else if (tx.type === "INCOME") {
                bucket.income += amount;
            }
        });

        const currencies = Array.from(monthMapsByCurrency.entries()).map(([currency, monthMap]) => ({
            currency,
            months: months.map((month) => monthMap[month.key] ?? { ...month }),
        }));

        if (currencies.length === 0) {
            currencies.push({
                currency: defaultCurrency,
                months: emptyMonths,
            });
        }

        return {
            periods: months.map((month) => month.label),
            currencies,
        };
    }, [defaultCurrency, transactions]);

    const holdings = overview?.holdings ?? overview?.Holdings ?? [];
    const investmentLabels = holdings.map((holding) => holding.symbol ?? holding.Symbol ?? "Holding");
    const portfolioSeries = [
        {
            label: "Market value",
            data: holdings.map((holding) => Number(holding.marketValue ?? holding.MarketValue ?? 0)),
            color: "#1570ef",
        },
        {
            label: "Cost basis",
            data: holdings.map((holding) => {
                const quantity = Number(holding.quantity ?? holding.Quantity ?? 0);
                const avgCost = Number(holding.avgCost ?? holding.AvgCost ?? 0);
                return quantity * avgCost;
            }),
            color: "#12b76a",
        },
    ];

    const accountCurrencyTotals = useMemo(() => {
        const totals = new Map();

        accounts.forEach((account) => {
            const currency = account.currency || defaultCurrency;
            totals.set(currency, (totals.get(currency) || 0) + (account.currentBalance ?? 0));
        });

        return Array.from(totals, ([currency, amount]) => ({ currency, amount }));
    }, [accounts, defaultCurrency]);
    const hasMixedAccountCurrencies = accountCurrencyTotals.length > 1;
    const hasMixedCashFlowCurrencies = cashFlowData.currencies.length > 1;
    const cashFlowChartSeries = useMemo(
        () =>
            cashFlowData.currencies.flatMap(({ currency, months }, index) => {
                const palette = CASH_FLOW_PALETTE[index % CASH_FLOW_PALETTE.length];
                const suffix = hasMixedCashFlowCurrencies ? ` (${currency})` : "";

                return [
                    {
                        label: `Income${suffix}`,
                        data: months.map((month) => month.income),
                        color: palette.income,
                    },
                    {
                        label: `Spending${suffix}`,
                        data: months.map((month) => month.expense),
                        color: palette.expense,
                    },
                ];
            }),
        [cashFlowData.currencies, hasMixedCashFlowCurrencies]
    );
    const allocationItems = useMemo(
        () => (
            hasMixedAccountCurrencies
                ? accountCurrencyTotals.map(({ currency, amount }) => ({
                    label: currency,
                    value: formatCurrencyBreakdown([{ currency, amount }], 0),
                }))
                : accounts.map((account) => ({
                    label: account.name,
                    value: account.currentBalance ?? 0,
                }))
        ),
        [accountCurrencyTotals, accounts, hasMixedAccountCurrencies]
    );

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-80" />
                    <Skeleton className="h-4 w-[28rem] max-w-full" />
                </div>
                <div className="grid gap-6 xl:grid-cols-12">
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)] xl:col-span-12" />
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)] xl:col-span-4" />
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)] xl:col-span-8" />
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)] xl:col-span-6" />
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)] xl:col-span-6" />
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mt-12 rounded-[var(--radius-xl)] border border-[var(--color-error-100)] bg-[var(--color-error-50)] p-4 text-sm font-medium text-[var(--color-error-700)]">
                {loadError}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Overview"
                title={`Welcome back, ${displayName}`}
                description="Track balances, allocation, and short-term performance from one clean workspace."
            />

            <div className="grid gap-6 xl:grid-cols-12">
                <SavingsGoalCard
                    goal={savingsGoal}
                    accounts={accounts}
                    defaultCurrency={defaultCurrency}
                    onCreateGoal={handleCreateSavingsGoal}
                    onUpdateGoal={handleUpdateSavingsGoal}
                    onArchiveGoal={handleArchiveSavingsGoal}
                />
                <div className="xl:col-span-4">
                    <DailyCashFlowCalendar transactions={transactions} />
                </div>
                <div className="xl:col-span-8">
                    <AccountsPieChart
                        items={allocationItems}
                        title={hasMixedAccountCurrencies ? "Balances by currency" : "Account composition"}
                        description={hasMixedAccountCurrencies
                            ? "Balances are grouped by currency because no FX conversion is applied."
                            : "Balance split across your connected accounts."}
                        renderAsList={hasMixedAccountCurrencies}
                    />
                </div>
                <div className="xl:col-span-6">
                    <CashFlowChart
                        periods={cashFlowData.periods}
                        series={cashFlowChartSeries}
                        description={hasMixedCashFlowCurrencies
                            ? "Monthly income and spending grouped by currency without FX conversion."
                            : "Recent movement across recurring income and expenses."}
                    />
                </div>
                <div className="xl:col-span-6">
                    <InvestmentsChart
                        dates={investmentLabels}
                        portfolioSeries={portfolioSeries}
                    />
                </div>
                <ConnectedAccountsCard
                    accounts={accounts}
                    defaultCurrency={defaultCurrency}
                    onCreateManualAccount={handleCreateManualAccount}
                    onPlaidConnected={handlePlaidConnected}
                    onDeleteAccount={handleDeleteAccount}
                />
            </div>
        </div>
    );
}
