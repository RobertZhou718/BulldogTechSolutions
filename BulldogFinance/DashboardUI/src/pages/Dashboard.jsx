import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConnectedAccountsCard from "@/components/accounts/ConnectedAccountsCard.jsx";
import { useAuth } from "@/auth/core/authContext.js";
import AccountManagementCard from "@/components/accounts/AccountManagementCard.jsx";
import AccountsPieChart from "@/components/dashboard/AccountsPieChart.jsx";
import CashFlowChart from "@/components/dashboard/CashFlowChart.jsx";
import GreetingCard from "@/components/dashboard/GreetingCard.jsx";
import InvestmentsChart from "@/components/dashboard/InvestmentsChart.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrencyBreakdown } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient.js";

const CASH_FLOW_PALETTE = [
    { income: "#12b76a", expense: "#1570ef" },
    { income: "#f79009", expense: "#93370d" },
    { income: "#7a5af8", expense: "#5925dc" },
    { income: "#36bffa", expense: "#026aa2" },
];

export default function DashboardPage() {
    const { getAccounts, getTransactions, getInvestmentOverview, createAccount, deleteAccount } = useApiClient();
    const { user } = useAuth();

    const displayName = user?.givenName || user?.name || user?.username || "Friend";
    const defaultCurrency = "CAD";

    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadDashboard = useCallback(async () => {
        const end = new Date();
        const start = new Date(end);
        start.setMonth(end.getMonth() - 5);
        start.setDate(1);

        const [accountsData, transactionsData, overviewData] = await Promise.all([
            getAccounts(),
            getTransactions({
                from: start.toISOString(),
                to: end.toISOString(),
            }),
            getInvestmentOverview(),
        ]);

        setAccounts(accountsData || []);
        setTransactions(transactionsData || []);
        setOverview(overviewData || null);
    }, [getAccounts, getInvestmentOverview, getTransactions]);

    useEffect(() => {
        (async () => {
            try {
                await loadDashboard();
            } catch (e) {
                console.error(e);
                setError(e.message ?? "Failed to load accounts");
            } finally {
                setLoading(false);
            }
        })();
    }, [loadDashboard]);

    const refreshDashboard = async () => {
        setError(null);
        await loadDashboard();
    };

    const handleCreateManualAccount = async (payload) => {
        await createAccount(payload);
        await refreshDashboard();
    };

    const handlePlaidConnected = async () => {
        await refreshDashboard();
    };

    const handleDeleteAccount = async (accountId) => {
        await deleteAccount(accountId);
        await refreshDashboard();
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
    const netWorthLabel = useMemo(
        () => formatCurrencyBreakdown(accountCurrencyTotals, 0),
        [accountCurrencyTotals]
    );
    const hasMixedCashFlowCurrencies = cashFlowData.currencies.length > 1;
    const latestCashFlowEntries = useMemo(
        () =>
            cashFlowData.currencies.map(({ currency, months }) => {
                const latest = months[months.length - 1];
                return {
                    currency,
                    amount: (latest?.income ?? 0) - (latest?.expense ?? 0),
                };
            }),
        [cashFlowData.currencies]
    );
    const latestCashFlowLabel = useMemo(
        () => formatCurrencyBreakdown(latestCashFlowEntries, 0),
        [latestCashFlowEntries]
    );
    const latestCashFlowPrimaryDelta = latestCashFlowEntries[0]?.amount ?? 0;
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
            <div className="mt-12 flex justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    if (error) {
        return <p className="mt-12 text-sm font-medium text-[var(--color-error-500)]">{error}</p>;
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Overview"
                title={`Welcome back, ${displayName}`}
                description="Track balances, allocation, and short-term performance from one clean workspace."
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                        label="Net worth"
                        value={netWorthLabel}
                        hint={hasMixedAccountCurrencies ? "Grouped by currency; no FX conversion applied" : "All linked accounts"}
                    />
                    <MetricCard
                        label="Linked accounts"
                        value={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
                    />
                    <MetricCard
                        label="Latest cash flow"
                        value={latestCashFlowLabel}
                        tone={hasMixedCashFlowCurrencies ? "default" : (latestCashFlowPrimaryDelta >= 0 ? "positive" : "negative")}
                        hint={hasMixedCashFlowCurrencies ? "Grouped by currency; no FX conversion applied" : undefined}
                    />
                </div>
            </PageHeader>

            <div className="grid gap-6 xl:grid-cols-12">
                <AccountManagementCard
                    accounts={accounts}
                    defaultCurrency={defaultCurrency}
                    onCreateManualAccount={handleCreateManualAccount}
                    onPlaidConnected={handlePlaidConnected}
                />
                <ConnectedAccountsCard accounts={accounts} onDeleteAccount={handleDeleteAccount} />
                <div className="xl:col-span-4">
                    <GreetingCard
                        isMultiCurrency={hasMixedAccountCurrencies}
                        name={displayName}
                        totalLabel={netWorthLabel}
                    />
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
            </div>
        </div>
    );
}
