import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Grid,
    CircularProgress,
    Typography,
    Stack,
    Paper,
} from "@mui/material";
import { useMsal } from "@azure/msal-react";
import GreetingCard from "../components/dashboard/GreetingCard.jsx";
import AccountsPieChart from "../components/dashboard/AccountsPieChart.jsx";
import CashFlowChart from "../components/dashboard/CashFlowChart.jsx";
import InvestmentsChart from "../components/dashboard/InvestmentsChart.jsx";
import { useApiClient } from "../services/apiClient.js";

export default function DashboardPage() {
    const { getAccounts } = useApiClient();
    const { accounts: msalAccounts } = useMsal();

    const displayName =
        msalAccounts[0]?.name || msalAccounts[0]?.username || "Friend";

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await getAccounts();
                setAccounts(data);
            } catch (e) {
                console.error(e);
                setError(e.message ?? "Failed to load accounts");
            } finally {
                setLoading(false);
            }
        })();
    }, [getAccounts]);

    // Static demo data for CashFlow / Investments until real endpoints are ready
    const periods = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const income = [2200, 2300, 2100, 2500, 2400, 2600];
    const expenses = [1500, 1600, 1550, 1700, 1650, 1800];

    const invDates = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
    const portfolioSeries = [
        { label: "Portfolio", data: [10000, 10120, 10200, 10350, 10400] },
    ];

    const totalNetWorth = useMemo(
        () =>
            accounts.reduce(
                (sum, acc) => sum + (acc.currentBalance ?? 0),
                0
            ),
        [accounts]
    );

    const latestCashFlowDelta = useMemo(() => {
        const latestIncome = income[income.length - 1] ?? 0;
        const latestExpense = expenses[expenses.length - 1] ?? 0;
        return latestIncome - latestExpense;
    }, [income, expenses]);

    const pieAccounts = useMemo(
        () =>
            accounts.map((acc) => ({
                id: acc.accountId,
                name: acc.name,
                balance: acc.currentBalance,
            })),
        [accounts]
    );

    const statCardStyles = {
        bgcolor: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(148,163,184,0.35)",
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        minWidth: 180,
    };

    if (loading) {
        return (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="error" sx={{ mt: 4 }}>
                {error}
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                mt: 1,
                maxWidth: 1400,
                mx: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 3,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="overline" color="text.secondary">
                        Overview
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Welcome back, {displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track your balances, allocations, and recent performance at a
                        glance.
                    </Typography>
                </Box>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems="stretch"
                >
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Net worth (all accounts)
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {totalNetWorth.toLocaleString("en-CA", {
                                style: "currency",
                                currency: "CAD",
                                maximumFractionDigits: 0,
                            })}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Linked accounts
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Latest cash flow
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                mt: 0.5,
                                color:
                                    latestCashFlowDelta >= 0 ? "success.main" : "error.main",
                            }}
                        >
                            {latestCashFlowDelta.toLocaleString("en-CA", {
                                style: "currency",
                                currency: "CAD",
                                maximumFractionDigits: 0,
                            })}
                        </Typography>
                    </Paper>
                </Stack>
            </Box>

            <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={5} lg={4} sx={{ display: "flex" }}>
                    <GreetingCard name={displayName} total={totalNetWorth} />
                </Grid>
                <Grid item xs={12} md={7} lg={8} sx={{ display: "flex" }}>
                    <AccountsPieChart accounts={pieAccounts} />
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: "flex" }}>
                    <CashFlowChart
                        periods={periods}
                        income={income}
                        expenses={expenses}
                    />
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: "flex" }}>
                    <InvestmentsChart
                        dates={invDates}
                        portfolioSeries={portfolioSeries}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
