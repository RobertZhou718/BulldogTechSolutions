import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Container, Grid, Typography } from "@mui/material";
import { useApiClient } from "../services/apiClient";
import TransactionForm from "../components/transactions/TransactionForm.jsx";
import TransactionFilters from "../components/transactions/TransactionFilters.jsx";
import TransactionTable from "../components/transactions/TransactionTable.jsx";

export default function TransactionsPage() {
    const { getAccounts, getTransactions, createTransaction } = useApiClient();

    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState("");
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

    // 加载账户列表
    useEffect(() => {
        (async () => {
            try {
                const data = await getAccounts();
                setAccounts(data || []);
                if (data && data.length > 0) {
                    setSelectedAccountId(data[0].accountId);
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
        if (!selectedAccountId) return;

        (async () => {
            setLoadingTx(true);
            setError("");
            try {
                const params = { accountId: selectedAccountId };

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
    }, [selectedAccountId, filters.from, filters.to, getTransactions]);

    // 新增交易
    const handleCreateTransaction = async (txInput) => {
        try {
            await createTransaction(txInput);

            const params = { accountId: txInput.accountId };
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

            // 默认按日期
            const ad = new Date(a.occurredAtUtc || a.occurredAt || a.createdAtUtc || 0).getTime();
            const bd = new Date(b.occurredAtUtc || b.occurredAt || b.createdAtUtc || 0).getTime();
            return sortDirection === "asc" ? ad - bd : bd - ad;
        });

        return list;
    }, [transactions, filters.type, filters.category, sortField, sortDirection]);

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
        <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
                Transactions
            </Typography>

            {error && (
                <Typography sx={{ mb: 2 }} color="error">
                    {error}
                </Typography>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <TransactionForm
                        accounts={accounts}
                        selectedAccountId={selectedAccountId}
                        onAccountChange={setSelectedAccountId}
                        onSubmit={handleCreateTransaction}
                    />
                </Grid>
                <Grid item xs={12} md={8}>
                    <TransactionFilters
                        filters={filters}
                        onChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />
                    {loadingTx ? (
                        <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : (
                        <TransactionTable
                            transactions={visibleTransactions}
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
