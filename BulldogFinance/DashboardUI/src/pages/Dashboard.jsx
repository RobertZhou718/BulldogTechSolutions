import React, { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import AccountsPieChart from "@/components/dashboard/AccountsPieChart.jsx";
import CashFlowChart from "@/components/dashboard/CashFlowChart.jsx";
import GreetingCard from "@/components/dashboard/GreetingCard.jsx";
import InvestmentsChart from "@/components/dashboard/InvestmentsChart.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrency } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient.js";

export default function DashboardPage() {
    const { getAccounts, getTransactions, getInvestmentOverview } = useApiClient();
    const { accounts: msalAccounts } = useMsal();

    const displayName = msalAccounts[0]?.name || msalAccounts[0]?.username || "Friend";

    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
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
            } catch (e) {
                console.error(e);
                setError(e.message ?? "Failed to load accounts");
            } finally {
                setLoading(false);
            }
        })();
    }, [getAccounts, getInvestmentOverview, getTransactions]);

    const cashFlowSeries = useMemo(() => {
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

        const monthMap = months.reduce((map, month) => {
            map[month.key] = month;
            return map;
        }, {});

        transactions.forEach((tx) => {
            const occurredAt = tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc;
            if (!occurredAt) return;

            const date = new Date(occurredAt);
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
            const bucket = monthMap[key];
            if (!bucket) return;

            const amount = Number(tx.amount) || 0;
            if (tx.type === "EXPENSE") {
                bucket.expense += amount;
            } else if (tx.type === "INCOME") {
                bucket.income += amount;
            }
        });

        return months;
    }, [transactions]);

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

    const totalNetWorth = useMemo(
        () => accounts.reduce((sum, acc) => sum + (acc.currentBalance ?? 0), 0),
        [accounts]
    );

    const latestCashFlowDelta = useMemo(() => {
        const latest = cashFlowSeries[cashFlowSeries.length - 1];
        const latestIncome = latest?.income ?? 0;
        const latestExpense = latest?.expense ?? 0;
        return latestIncome - latestExpense;
    }, [cashFlowSeries]);

    const pieAccounts = useMemo(
        () =>
            accounts.map((acc) => ({
                id: acc.accountId,
                name: acc.name,
                balance: acc.currentBalance ?? 0,
            })),
        [accounts]
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
                        value={formatCurrency(totalNetWorth, "CAD", 0)}
                        hint="All linked accounts"
                    />
                    <MetricCard
                        label="Linked accounts"
                        value={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
                    />
                    <MetricCard
                        label="Latest cash flow"
                        value={formatCurrency(latestCashFlowDelta, "CAD", 0)}
                        tone={latestCashFlowDelta >= 0 ? "positive" : "negative"}
                    />
                </div>
            </PageHeader>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-4">
                    <GreetingCard name={displayName} total={totalNetWorth} />
                </div>
                <div className="xl:col-span-8">
                    <AccountsPieChart accounts={pieAccounts} />
                </div>
                <div className="xl:col-span-6">
                    <CashFlowChart
                        periods={cashFlowSeries.map((item) => item.label)}
                        income={cashFlowSeries.map((item) => item.income)}
                        expenses={cashFlowSeries.map((item) => item.expense)}
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
