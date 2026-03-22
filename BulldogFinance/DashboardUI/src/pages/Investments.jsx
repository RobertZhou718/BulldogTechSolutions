import React, { useCallback, useEffect, useMemo, useState } from "react";
import HoldingsCard from "@/components/investments/HoldingsCard.jsx";
import NewsCard from "@/components/investments/NewsCard.jsx";
import WatchlistCard from "@/components/investments/WatchlistCard.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { formatCurrency } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient";

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
            const [o, w] = await Promise.all([getInvestmentOverview(), getWatchlist()]);
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

    const holdings = overview?.Holdings ?? overview?.holdings ?? [];

    const totals = useMemo(() => {
        const marketValue = holdings.reduce(
            (sum, h) => sum + (h.MarketValue ?? h.marketValue ?? 0),
            0
        );
        const pnl = holdings.reduce((sum, h) => sum + (h.UnrealizedPnL ?? h.unrealizedPnL ?? 0), 0);
        return { marketValue, pnl, positions: holdings.length };
    }, [holdings]);

    const withSave = async (operation, fallbackMessage) => {
        setSaving(true);
        setError("");
        try {
            await operation();
            await loadAll();
        } catch (err) {
            console.error(fallbackMessage, err);
            setError(err.message || fallbackMessage);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Investments"
                title="Portfolio overview"
                description="Track your positions, watchlist, and market context from a single portfolio workspace."
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                        label="Total market value"
                        value={formatCurrency(totals.marketValue, "USD", 0)}
                    />
                    <MetricCard
                        label="Unrealized PnL"
                        value={formatCurrency(totals.pnl, "USD", 0)}
                        tone={totals.pnl >= 0 ? "positive" : "negative"}
                    />
                    <MetricCard label="Positions" value={totals.positions} />
                </div>
            </PageHeader>

            {error ? <p className="text-sm font-medium text-[var(--color-error-500)]">{error}</p> : null}

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-7">
                    <HoldingsCard
                        holdings={holdings}
                        loading={loading}
                        saving={saving}
                        onAdd={(payload) => withSave(() => upsertInvestment(payload), "Failed to save investment.")}
                        onDelete={(symbol) => withSave(() => deleteInvestment(symbol), "Failed to delete investment.")}
                    />
                </div>

                <div className="xl:col-span-5">
                    <WatchlistCard
                        items={watchlist}
                        loading={loading}
                        saving={saving}
                        onAdd={(symbol, exchange) =>
                            withSave(
                                () => addToWatchlist({ symbol, exchange }),
                                "Failed to add watchlist item."
                            )
                        }
                        onDelete={(symbol) =>
                            withSave(() => removeFromWatchlist(symbol), "Failed to remove watchlist item.")
                        }
                    />
                </div>

                <div className="xl:col-span-7" />

                <div className="xl:col-span-5">
                    <NewsCard overview={overview} loading={loading} />
                </div>
            </div>
        </div>
    );
}
