import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Box,
    Grid,
    Typography,
    Alert,
    Container,
    Paper,
    Stack,
} from "@mui/material";
import { useApiClient } from "../services/apiClient";
import HoldingsCard from "../components/investments/HoldingsCard.jsx";
import WatchlistCard from "../components/investments/WatchlistCard.jsx";
import NewsCard from "../components/investments/NewsCard.jsx";

export default function InvestmentsPage() {
    const {
        getInvestmentOverview,
        getWatchlist,
        upsertInvestment,
        deleteInvestment,
        addToWatchlist,
        removeFromWatchlist,
    } = useApiClient();

    const [overview, setOverview] = useState(null);
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [o, w] = await Promise.all([
                getInvestmentOverview(),
                getWatchlist(),
            ]);

            setOverview(o || {});
            setWatchlist(Array.isArray(w) ? w : []);
        } catch (err) {
            console.error("Failed to load investments data", err);
            setError(err.message || "Failed to load investments data.");
        } finally {
            setLoading(false);
        }
    }, [getInvestmentOverview, getWatchlist]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const handleAddInvestment = async (payload) => {
        setSaving(true);
        setError("");
        try {
            await upsertInvestment(payload);
            await loadAll();
        } catch (err) {
            console.error("Failed to save investment", err);
            setError(err.message || "Failed to save investment.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteInvestment = async (symbol) => {
        setSaving(true);
        setError("");
        try {
            await deleteInvestment(symbol);
            await loadAll();
        } catch (err) {
            console.error("Failed to delete investment", err);
            setError(err.message || "Failed to delete investment.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddWatchlist = async (symbol, exchange) => {
        setSaving(true);
        setError("");
        try {
            await addToWatchlist({ symbol, exchange });
            await loadAll();
        } catch (err) {
            console.error("Failed to add watchlist item", err);
            setError(err.message || "Failed to add watchlist item.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWatchlist = async (symbol) => {
        setSaving(true);
        setError("");
        try {
            await removeFromWatchlist(symbol);
            await loadAll();
        } catch (err) {
            console.error("Failed to remove watchlist item", err);
            setError(err.message || "Failed to remove watchlist item.");
        } finally {
            setSaving(false);
        }
    };

    const holdings = overview?.Holdings ?? overview?.holdings ?? [];

    const totals = useMemo(() => {
        const list = holdings || [];
        const marketValue = list.reduce(
            (sum, h) => sum + (h.MarketValue ?? h.marketValue ?? 0),
            0
        );
        const pnl = list.reduce(
            (sum, h) => sum + (h.UnrealizedPnL ?? h.unrealizedPnL ?? 0),
            0
        );
        return {
            marketValue,
            pnl,
            positions: list.length,
        };
    }, [holdings]);

    const statCardStyles = {
        bgcolor: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(148,163,184,0.35)",
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        minWidth: 180,
    };

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
                <Box>
                    <Typography variant="overline" color="text.secondary">
                        INVESTMENTS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Portfolio overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track your positions, watchlist, and latest market news.
                    </Typography>
                </Box>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems="stretch"
                >
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Total market value
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {totals.marketValue.toLocaleString("en-CA", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                            })}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Unrealized PnL
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                mt: 0.5,
                                color:
                                    totals.pnl >= 0
                                        ? "success.main"
                                        : "error.main",
                            }}
                        >
                            {totals.pnl.toLocaleString("en-CA", {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                            })}
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={statCardStyles}>
                        <Typography variant="caption" color="text.secondary">
                            Positions
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            {totals.positions}
                        </Typography>
                    </Paper>
                </Stack>
            </Box>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError("")}>
                        {error}
                    </Alert>
                </Box>
            )}

            {/* 第一行：Investments + Watchlist；第二行右侧 News */}
            <Grid container spacing={3} alignItems="stretch">
                {/* 第一行：Investments */}
                <Grid
                    item
                    xs={12}
                    md={7}
                    sx={{ display: "flex", width: "100%", minWidth: 0 }}
                >
                    <Box sx={{ width: "100%" }}>
                        <HoldingsCard
                            holdings={holdings}
                            loading={loading}
                            saving={saving}
                            onAdd={handleAddInvestment}
                            onDelete={handleDeleteInvestment}
                        />
                    </Box>
                </Grid>

                {/* 第一行：Watchlist */}
                <Grid
                    item
                    xs={12}
                    md={5}
                    sx={{ display: "flex", width: "100%", minWidth: 0 }}
                >
                    <Box sx={{ width: "100%" }}>
                        <WatchlistCard
                            items={watchlist}
                            loading={loading}
                            saving={saving}
                            onAdd={handleAddWatchlist}
                            onDelete={handleDeleteWatchlist}
                        />
                    </Box>
                </Grid>

                {/* 第二行：左侧占位，让 News 靠右 */}
                <Grid item xs={false} md={7} />

                {/* 第二行：右侧 News */}
                <Grid
                    item
                    xs={12}
                    md={5}
                    sx={{ display: "flex", width: "100%", minWidth: 0 }}
                >
                    <Box sx={{ width: "100%" }}>
                        <NewsCard overview={overview} loading={loading} />
                    </Box>
                </Grid>
            </Grid>
        </Container>
    );
}
