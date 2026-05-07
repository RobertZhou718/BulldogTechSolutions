import React, { useMemo, useState } from "react";
import Card from "@/components/ui/Card.jsx";

const COLLAPSED_COUNT = 3;

export default function NewsCard({ overview, loading }) {
    const [expanded, setExpanded] = useState(false);
    const items = useMemo(() => {
        if (!overview) return [];

        const holdingsRaw = overview.Holdings ?? overview.holdings ?? [];
        const popularRaw = overview.Popular ?? overview.popular ?? [];

        const fromHoldings = holdingsRaw.flatMap((h) => {
            const symbol = h.Symbol ?? h.symbol;
            const newsArr = h.News ?? h.news ?? [];
            return newsArr.map((n) => ({
                id: n.Id ?? n.id ?? `${symbol}-${n.Datetime ?? n.datetime}`,
                symbol,
                headline: n.Headline ?? n.headline,
                source: n.Source ?? n.source,
                datetime: n.Datetime ?? n.datetime,
                url: n.Url ?? n.url,
            }));
        });

        const fromPopular = popularRaw.flatMap((p) => {
            const symbol = p.Symbol ?? p.symbol;
            const newsArr = p.News ?? p.news ?? [];
            return newsArr.map((n) => ({
                id: n.Id ?? n.id ?? `${symbol}-${n.Datetime ?? n.datetime}`,
                symbol,
                headline: n.Headline ?? n.headline,
                source: n.Source ?? n.source,
                datetime: n.Datetime ?? n.datetime,
                url: n.Url ?? n.url,
            }));
        });

        return (fromHoldings.length > 0 ? fromHoldings : fromPopular)
            .sort((a, b) => {
                const da = a.datetime ? new Date(a.datetime).getTime() : 0;
                const db = b.datetime ? new Date(b.datetime).getTime() : 0;
                return db - da;
            })
            .slice(0, 8);
    }, [overview]);

    const visibleItems = expanded ? items : items.slice(0, COLLAPSED_COUNT);
    const hiddenCount = Math.max(items.length - COLLAPSED_COUNT, 0);

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                News
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                Latest market headlines
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Recent symbol-linked news from your holdings and popular names.
            </p>

            {loading && items.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--text-muted)]">Loading news...</p>
            ) : items.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--text-muted)]">No recent market headlines.</p>
            ) : (
                <div className="mt-6 space-y-4">
                    {visibleItems.map((item) => (
                        <a
                            key={`${item.id}-${item.symbol}`}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-4 transition hover:border-[#b2ddff] hover:bg-[var(--card-bg-strong)]"
                        >
                            <div className="flex items-start gap-3">
                                <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--brand)]">
                                    {item.symbol}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-main)]">
                                        {item.headline}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                                        {item.source ?? "Source"} ·{" "}
                                        {item.datetime ? new Date(item.datetime).toLocaleDateString() : "Recent"}
                                    </p>
                                </div>
                            </div>
                        </a>
                    ))}

                    {hiddenCount > 0 ? (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => setExpanded((current) => !current)}
                                className="min-h-9 rounded-full px-3 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                            >
                                {expanded ? "Collapse" : `+${hiddenCount} more`}
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </Card>
    );
}
