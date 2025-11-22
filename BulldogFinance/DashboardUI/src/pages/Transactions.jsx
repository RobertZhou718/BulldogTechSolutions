import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    CircularProgress,
    Container,
    Grid,
    Typography,
    Paper,
    Stack,
    Select,
    MenuItem,
} from "@mui/material";
import { useApiClient } from "../services/apiClient";
import TransactionForm from "../components/transactions/TransactionForm.jsx";
import TransactionFilters from "../components/transactions/TransactionFilters.jsx";
import TransactionTable from "../components/transactions/TransactionTable.jsx";

export default function TransactionsPage() {
    const { getAccounts, getTransactions, createTransaction } = useApiClient();

    const [accounts, setAccounts] = useState([]);
    const [formAccountId, setFormAccountId] = useState("");
    const [historyAccountId, setHistoryAccountId] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);
    const [error, setError] = useState("");

    const [filters, setFilters] = useState({
        type: "ALL",
        from: "",
        to: "",
        category: "",
    });

    const [sortField, setSortField] = useState("date");
    const [sortDirection, setSortDirection] = useState("desc");

    useEffect(() => {
        (async () => {
            try {
                const data = await getAccounts();
                setAccounts(data || []);
                if (data && data.length > 0) {
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

                if (historyAccountId !== "ALL") {
                    params.accountId = historyAccountId;
                }

                if (filters.from) {
                    params.from = new Date(filters.from + "T00:00:00Z").toISOString();
                }
                if (filters.to) {
                    params.to = new Date(filters.to + "T23:59:59Z").toISOString();
                }

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

        if (filters.type !== "ALL") {
            list = list.filter((tx) => tx.type === filters.type);
        }

        if (filters.category) {
            const keyword = filters.category.toLowerCase();
            list = list.filter((tx) =>
                (tx.category || "").toLowerCase().includes(keyword)
            );
        }

        list.sort((a, b) => {
            if (sortField === "amount") {
                const av = a.amount ?? 0;
                const bv = b.amount ?? 0;
                return sortDirection === "asc" ? av - bv : bv - av;
            }

            const ad = new Date(
                a.occurredAtUtc || a.occurredAt || a.createdAtUtc || 0
            ).getTime();
            const bd = new Date(
                b.occurredAtUtc || b.occurredAt || b.createdAtUtc || 0
            ).getTime();
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
                if (tx.type === "EXPENSE") {
                    acc.expense += amount;
                } else {
                    acc.income += amount;
                }
                return acc;
            },
            { income: 0, expense: 0 }
        );
        return {
            ...totals,
            net: totals.income - totals.expense,
            count: visibleTransactions.length,
        };
    }, [visibleTransactions]);

    const accountNameMap = useMemo(
        () =>
            accounts.reduce((map, acc) => {
                map[acc.accountId] = acc.name;
                return map;
            }, {}),
        [accounts]
    );

    const formatCurrency = (value) =>
        value.toLocaleString("en-CA", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        });

    const handleCreateTransaction = async (txInput) => {
        try {
            await createTransaction(txInput);

            const params = {};
            if (historyAccountId !== "ALL") {
                params.accountId = historyAccountId;
            }
            if (filters.from) {
                params.from = new Date(filters.from + "T00:00:00Z").toISOString();
            }
            if (filters.to) {
                params.to = new Date(filters.to + "T23:59:59Z").toISOString();
            }

            const data = await getTransactions(params);
            setTransactions(data || []);
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to create transaction.");
        }
    };

    const handleFilterChange = (nextFilters) => {
        setFilters(nextFilters);
    };

    const handleResetFilters = () => {
        setFilters({
            type: "ALL",
            from: "",
            to: "",
            category: "",
        });
    };

    const handleSortChange = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);
    };

    const statCardStyles = {
        bgcolor: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(148,163,184,0.35)",
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        minWidth: 180,
    };

    if (loadingAccounts) {
        return (
            <Box sx={{ mt: 6, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!accounts.length) {
        return (
            <Box sx={{ mt: 6, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                    No accounts found
                </Typography>
                <Typography color="text.secondary">
                    Please complete onboarding and create at least one account first.
                </Typography>
            </Box>
        );
    }

    return (
        <Container
            maxWidth="lg"
            sx={{
                mt: 2,
                mb: 4,
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box>
                        <Typography variant="overline" color="text.secondary">
                            Transactions
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {historyAccountId === "ALL"
                                ? "All accounts"
                                : viewAccount?.name || "Selected account"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Add transactions, filter by date or type, and review your history.
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Viewing
                        </Typography>
                        <Select
                            size="small"
                            value={historyAccountId || ""}
                            onChange={(e) => setHistoryAccountId(e.target.value)}
                            sx={{ minWidth: 200 }}
                        >
                            <MenuItem value="ALL">All accounts</MenuItem>
                            {accounts.map((acc) => (
                                <MenuItem key={acc.accountId} value={acc.accountId}>
                                    {acc.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                </Box>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems="stretch"
                >
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Net flow
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                mt: 0.5,
                                color: summary.net >= 0 ? "success.main" : "error.main",
                            }}
                        >
                            {formatCurrency(summary.net)}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Inflows
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {formatCurrency(summary.income)}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Outflows
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {formatCurrency(summary.expense)}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Items shown
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {summary.count}
                        </Typography>
                    </Paper>
                </Stack>
            </Box>

            {error && (
                <Typography sx={{ mb: 2 }} color="error">
                    {error}
                </Typography>
            )}

            <Grid
                container
                spacing={3}
                alignItems="stretch"
                sx={{ width: "100%", mx: 0 }}
            >
                <Grid item xs={12} sx={{ display: "flex", width: "100%", minWidth: 0 }}>
                    <TransactionForm
                        accounts={accounts}
                        selectedAccountId={formAccountId}
                        onAccountChange={setFormAccountId}
                        onSubmit={handleCreateTransaction}
                    />
                </Grid>
                <Grid
                    item
                    xs={12}
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        width: "100%",
                        minWidth: 0,
                    }}
                >
                    <TransactionFilters
                        filters={filters}
                        onChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />
                    {loadingTx ? (
                        <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : (
                        <TransactionTable
                            transactions={visibleTransactions}
                            accountNames={accountNameMap}
                            sortField={sortField}
                            sortDirection={sortDirection}
                            onSortChange={handleSortChange}
                        />
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
