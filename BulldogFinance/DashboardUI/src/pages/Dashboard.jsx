import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, CircularProgress, Typography } from "@mui/material";
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

    const totalNetWorth = useMemo(
        () =>
            accounts.reduce(
                (sum, acc) => sum + (acc.currentBalance ?? 0),
                0
            ),
        [accounts]
    );

    const pieAccounts = useMemo(
        () =>
            accounts.map((acc) => ({
                id: acc.accountId,
                name: acc.name,
                balance: acc.currentBalance,
            })),
        [accounts]
    );

    // 先用静态数据填充 CashFlow / Investments，后面我们可以再用真实交易数据替换
    const periods = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const income = [2200, 2300, 2100, 2500, 2400, 2600];
    const expenses = [1500, 1600, 1550, 1700, 1650, 1800];

    const invDates = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
    const portfolioSeries = [
        { label: "Portfolio", data: [10000, 10120, 10200, 10350, 10400] },
    ];

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
        <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <GreetingCard name={displayName} total={totalNetWorth} />
                </Grid>
                <Grid item xs={12} md={8}>
                    <AccountsPieChart accounts={pieAccounts} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <CashFlowChart
                        periods={periods}
                        income={income}
                        expenses={expenses}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <InvestmentsChart
                        dates={invDates}
                        portfolioSeries={portfolioSeries}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
