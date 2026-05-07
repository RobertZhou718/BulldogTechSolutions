import React, { useCallback, useEffect, useMemo, useState } from "react";
import HoldingsCard from "@/components/investments/HoldingsCard.jsx";
import InvestmentActivityCard from "@/components/investments/InvestmentActivityCard.jsx";
import NewsCard from "@/components/investments/NewsCard.jsx";
import WatchlistCard from "@/components/investments/WatchlistCard.jsx";
import PageHeader from "@/components/ui/PageHeader.jsx";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatCurrencyBreakdown } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient";
import { toast } from "sonner";

export default function InvestmentsPage() {
    const {
        getInvestmentOverview,
        getInvestmentActivity,
        getWatchlist,
        upsertInvestment,
        deleteInvestment,
        addToWatchlist,
        removeFromWatchlist,
    } = useApiClient();

    const [overview, setOverview] = useState(null);
    const [activity, setActivity] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [o, a, w] = await Promise.all([
                getInvestmentOverview(),
                getInvestmentActivity({ days: 90, limit: 50 }),
                getWatchlist(),
            ]);
            setOverview(o || {});
            setActivity(Array.isArray(a) ? a : []);
            setWatchlist(Array.isArray(w) ? w : []);
        } catch (err) {
            console.error("Failed to load investments data", err);
            toast.error(err.message || "Failed to load investments data.");
        } finally {
            setLoading(false);
        }
    }, [getInvestmentActivity, getInvestmentOverview, getWatchlist]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const holdings = useMemo(
        () => overview?.Holdings ?? overview?.holdings ?? [],
        [overview]
    );

    const totals = useMemo(() => {
        const totalsByCurrency = overview?.TotalsByCurrency ?? overview?.totalsByCurrency ?? [];
        if (Array.isArray(totalsByCurrency) && totalsByCurrency.length > 0) {
            const marketEntries = totalsByCurrency.map((item) => ({
                currency: item.Currency ?? item.currency ?? "USD",
                amount: item.MarketValue ?? item.marketValue ?? 0,
            }));
            const pnlEntries = totalsByCurrency.map((item) => ({
                currency: item.Currency ?? item.currency ?? "USD",
                amount: item.UnrealizedPnL ?? item.unrealizedPnL ?? 0,
            }));
            const positions = totalsByCurrency.reduce(
                (sum, item) => sum + (item.Positions ?? item.positions ?? 0),
                0
            );
            const singleCurrencyPnl = totalsByCurrency.length === 1
                ? totalsByCurrency[0].UnrealizedPnL ?? totalsByCurrency[0].unrealizedPnL ?? 0
                : null;

            return {
                marketValueLabel: formatCurrencyBreakdown(marketEntries, 0),
                pnlLabel: formatCurrencyBreakdown(pnlEntries, 0),
                pnlTone: singleCurrencyPnl == null ? "default" : singleCurrencyPnl >= 0 ? "positive" : "negative",
                positions,
            };
        }

        const marketValue = holdings.reduce(
            (sum, h) => sum + (h.MarketValue ?? h.marketValue ?? 0),
            0
        );
        const pnl = holdings.reduce((sum, h) => sum + (h.UnrealizedPnL ?? h.unrealizedPnL ?? 0), 0);
        return {
            marketValueLabel: formatCurrency(marketValue, "USD", 0),
            pnlLabel: formatCurrency(pnl, "USD", 0),
            pnlTone: pnl >= 0 ? "positive" : "negative",
            positions: holdings.length,
        };
    }, [holdings, overview]);

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
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <Skeleton className="h-80 rounded-[var(--radius-2xl)]" />
                    <div className="grid gap-6 xl:grid-cols-12">
                        <Skeleton className="h-72 rounded-[var(--radius-2xl)] xl:col-span-5" />
                        <Skeleton className="h-72 rounded-[var(--radius-2xl)] xl:col-span-7" />
                    </div>
                    <Skeleton className="h-64 rounded-[var(--radius-2xl)]" />
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
            />

            <div className="grid grid-cols-1 gap-6">
                <HoldingsCard
                    holdings={holdings}
                    loading={loading}
                    saving={saving}
                    totals={totals}
                    onAdd={(payload) => withSave(() => upsertInvestment(payload), "Failed to save investment.")}
                    onDelete={(symbol) => withSave(() => deleteInvestment(symbol), "Failed to delete investment.")}
                />

                <div className="grid gap-6 xl:grid-cols-12">
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
                    <div className="xl:col-span-7">
                        <NewsCard overview={overview} loading={loading} />
                    </div>
                </div>

                <InvestmentActivityCard items={activity} loading={loading} />
            </div>
        </div>
    );
}
