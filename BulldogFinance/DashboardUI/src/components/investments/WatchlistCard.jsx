import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import { Field, Input } from "@/components/ui/Field.jsx";
import Spinner from "@/components/ui/Spinner.jsx";

export default function WatchlistCard({ items, loading, saving, onAdd, onDelete }) {
    const [symbol, setSymbol] = useState("");
    const [exchange, setExchange] = useState("US");
    const list = items || [];

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

            <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
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
                <div className="mt-6 flex justify-center py-8">
                    <Spinner className="h-6 w-6" />
                </div>
            ) : list.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--text-muted)]">No symbols in your watchlist yet.</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {list
                        .filter((w) => w && (w.Symbol || w.symbol))
                        .map((w, index) => {
                            const s = w.Symbol ?? w.symbol;
                            const ex = w.Exchange ?? w.exchange ?? "US";
                            const added = w.AddedAtUtc ?? w.addedAtUtc ?? null;

                            return (
                                <div
                                    key={s || index}
                                    className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-main)]">{s} · {ex}</p>
                                        <p className="text-sm text-[var(--text-soft)]">
                                            {added ? new Date(added).toLocaleDateString() : "Recently added"}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="px-3 py-1.5"
                                        onClick={() => onDelete?.(s)}
                                        disabled={saving}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            );
                        })}
                </div>
            )}
        </Card>
    );
}
