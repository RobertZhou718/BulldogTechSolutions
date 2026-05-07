import React, { useState } from "react";
import { Trash01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import { Field, Input } from "@/components/ui/Field.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrency } from "@/lib/utils";

function readNumber(item, ...keys) {
    for (const key of keys) {
        const value = item?.[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
}

export default function WatchlistCard({ items, loading, saving, onAdd, onDelete }) {
    const [symbol, setSymbol] = useState("");
    const [exchange, setExchange] = useState("US");
    const list = (items || []).filter((w) => w && (w.Symbol || w.symbol));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!symbol) return;
        onAdd?.(symbol.trim().toUpperCase(), (exchange || "US").trim().toUpperCase());
        setSymbol("");
    };

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Watchlist
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">Tracked symbols</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
                Keep an eye on names you may want to add next.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
                <Field label="Symbol">
                    <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                </Field>
                <Field label="Exchange">
                    <Input value={exchange} onChange={(e) => setExchange(e.target.value)} />
                </Field>
                <div className="flex items-end">
                    <Button type="submit" disabled={saving || !symbol} className="w-full">
                        Add
                    </Button>
                </div>
            </form>

            {loading ? (
                <div className="mt-5 flex justify-center py-6">
                    <Spinner className="h-6 w-6" />
                </div>
            ) : list.length === 0 ? (
                <p className="mt-5 text-sm text-[var(--text-muted)]">No symbols in your watchlist yet.</p>
            ) : (
                <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)]">
                        <thead>
                            <tr className="bg-[var(--bg-main)] text-left text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-soft)]">
                                <th className="px-3 py-2">Symbol</th>
                                <th className="px-3 py-2">Exch</th>
                                <th className="px-3 py-2 text-right">Last</th>
                                <th className="px-3 py-2 text-right">Change</th>
                                <th className="px-3 py-2 text-right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)] text-sm">
                            {list.map((w, index) => {
                                const s = w.Symbol ?? w.symbol;
                                const ex = w.Exchange ?? w.exchange ?? "US";
                                const currency = w.Currency ?? w.currency ?? "USD";
                                const last = readNumber(w, "LastPrice", "lastPrice", "CurrentPrice", "currentPrice");
                                const changePct = readNumber(
                                    w,
                                    "DailyChangePercent",
                                    "dailyChangePercent",
                                    "ChangePercent",
                                    "changePercent"
                                );
                                const change = readNumber(w, "DailyChange", "dailyChange", "Change", "change");
                                const tone =
                                    changePct != null
                                        ? changePct >= 0
                                            ? "text-[var(--color-success-700)]"
                                            : "text-[var(--color-error-700)]"
                                        : change != null
                                          ? change >= 0
                                              ? "text-[var(--color-success-700)]"
                                              : "text-[var(--color-error-700)]"
                                          : "text-[var(--text-soft)]";

                                return (
                                    <tr key={s || index}>
                                        <td className="px-3 py-2 font-medium text-[var(--text-main)]">{s}</td>
                                        <td className="px-3 py-2 text-[var(--text-soft)]">{ex}</td>
                                        <td className="px-3 py-2 text-right text-[var(--text-main)]">
                                            {last != null ? formatCurrency(last, currency, 2) : "—"}
                                        </td>
                                        <td className={`px-3 py-2 text-right font-medium ${tone}`}>
                                            {changePct != null
                                                ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`
                                                : change != null
                                                  ? `${change >= 0 ? "+" : ""}${formatCurrency(change, currency, 2)}`
                                                  : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full"
                                                onClick={() => onDelete?.(s)}
                                                disabled={saving}
                                                aria-label={`Remove ${s}`}
                                            >
                                                <Trash01 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
