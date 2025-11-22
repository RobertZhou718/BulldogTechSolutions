import React, { useEffect, useState, useCallback } from "react";
import { Box, Grid, Typography, Alert } from "@mui/material";
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

    // 直接存后端原始对象（PascalCase）
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

            setOverview(o || {});                        // 不强制 camelCase
            setWatchlist(Array.isArray(w) ? w : []);     // watchlist 直接原样保存
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

    return (
        <Box>
            <Box mb={3}>
                <Typography variant="h5" fontWeight={600}>
                    Investments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Track your positions, watchlist, and latest market news.
                </Typography>
            </Box>

            {error && (
                <Box mb={2}>
                    <Alert severity="error" onClose={() => setError("")}>
                        {error}
                    </Alert>
                </Box>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <HoldingsCard
                        holdings={holdings}
                        loading={loading}
                        saving={saving}
                        onAdd={handleAddInvestment}
                        onDelete={handleDeleteInvestment}
                    />
                </Grid>
                <Grid item xs={12} md={5}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <WatchlistCard
                            items={watchlist}
                            loading={loading}
                            saving={saving}
                            onAdd={handleAddWatchlist}
                            onDelete={handleDeleteWatchlist}
                        />
                        <NewsCard overview={overview} loading={loading} />
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
