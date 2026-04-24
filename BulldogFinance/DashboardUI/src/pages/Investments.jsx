import React, { useCallback, useEffect, useMemo, useState } from "react";
import HoldingsCard from "@/components/investments/HoldingsCard.jsx";
import NewsCard from "@/components/investments/NewsCard.jsx";
import WatchlistCard from "@/components/investments/WatchlistCard.jsx";
import MetricCard from "@/components/ui/MetricCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient";
import { toast } from "sonner";

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

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [o, w] = await Promise.all([getInvestmentOverview(), getWatchlist()]);
            setOverview(o || {});
            setWatchlist(Array.isArray(w) ? w : []);
        } catch (err) {
            console.error("Failed to load investments data", err);
            toast.error(err.message || "Failed to load investments data.");
        } finally {
            setLoading(false);
        }
    }, [getInvestmentOverview, getWatchlist]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const holdings = useMemo(
        () => overview?.Holdings ?? overview?.holdings ?? [],
        [overview]
    );

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
        try {
            await operation();
            await loadAll();
        } catch (err) {
            console.error(fallbackMessage, err);
            toast.error(err.message || fallbackMessage);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !overview) {
        return (
            <div className="space-y-8">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-4 w-[28rem] max-w-full" />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                        <Skeleton className="h-24 rounded-[var(--radius-2xl)]" />
                    </div>
                </div>
                <div className="grid gap-6 xl:grid-cols-12">
                    <Skeleton className="h-80 rounded-[var(--radius-2xl)] xl:col-span-7" />
                    <Skeleton className="h-80 rounded-[var(--radius-2xl)] xl:col-span-5" />
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)] xl:col-span-5 xl:col-start-8" />
                </div>
            </div>
        );
    }

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
