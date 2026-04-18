import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button.jsx";
import Card from "@/components/ui/Card.jsx";
import { Field, Input } from "@/components/ui/Field.jsx";
import Spinner from "@/components/ui/Spinner.jsx";

export default function HoldingsCard({
    holdings,
    loading,
    saving,
    onAdd,
    onDelete,
}) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        symbol: "",
        quantity: "",
        avgCost: "",
        currency: "USD",
    });
    const list = useMemo(() => holdings || [], [holdings]);

    const totals = useMemo(() => {
        const totalMarketValue = list.reduce(
            (sum, h) => sum + (h.MarketValue ?? h.marketValue ?? 0),
            0
        );
        const totalPnL = list.reduce(
            (sum, h) => sum + (h.UnrealizedPnL ?? h.unrealizedPnL ?? 0),
            0
        );
        return { totalMarketValue, totalPnL };
    }, [list]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = () => {
        if (!form.symbol || !form.quantity || !form.avgCost) return;

        onAdd?.({
            symbol: form.symbol.trim().toUpperCase(),
            quantity: Number(form.quantity),
            avgCost: Number(form.avgCost),
            currency: form.currency || "USD",
            exchange: "US",
        });
        setOpen(false);
        setForm({ symbol: "", quantity: "", avgCost: "", currency: "USD" });
    };

    return (
        <>
            <Card className="h-full">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                            Portfolio
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                            Investments
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            Total MV: ${totals.totalMarketValue.toFixed(2)} · PnL: ${totals.totalPnL.toFixed(2)}
                        </p>
                    </div>

                    <Button onClick={() => setOpen(true)}>
                        <span className="text-base leading-none">+</span>
                        Add position
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Spinner className="h-7 w-7" />
                    </div>
                ) : list.length === 0 ? (
                    <p className="mt-6 text-sm text-[var(--text-muted)]">
                        You don't have any investments yet. Add your first position to start tracking.
                    </p>
                ) : (
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--card-border)]">
                            <thead>
                                <tr className="bg-[var(--bg-main)] text-left text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-soft)]">
                                    <th className="px-4 py-3">Symbol</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Avg Cost</th>
                                    <th className="px-4 py-3 text-right">Price</th>
                                    <th className="px-4 py-3 text-right">MV</th>
                                    <th className="px-4 py-3 text-right">PnL</th>
                                    <th className="px-4 py-3 text-right">PnL %</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)] bg-white text-sm">
                                {list.map((h) => {
                                    const symbol = h.Symbol ?? h.symbol;
                                    const qty = h.Quantity ?? h.quantity ?? 0;
                                    const avgCost = h.AvgCost ?? h.avgCost ?? 0;
                                    const price = h.CurrentPrice ?? h.currentPrice ?? 0;
                                    const mv = h.MarketValue ?? h.marketValue ?? qty * price;
                                    const pnl = h.UnrealizedPnL ?? h.unrealizedPnL ?? 0;
                                    const pnlPct = h.UnrealizedPnLPercent ?? h.unrealizedPnLPercent ?? 0;

                                    return (
                                        <tr key={symbol}>
                                            <td className="px-4 py-4 font-semibold text-[var(--text-main)]">
                                                {symbol}
                                            </td>
                                            <td className="px-4 py-4 text-right">{qty}</td>
                                            <td className="px-4 py-4 text-right">{avgCost.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-right">{price ? price.toFixed(2) : "-"}</td>
                                            <td className="px-4 py-4 text-right">{mv ? mv.toFixed(2) : "-"}</td>
                                            <td
                                                className={`px-4 py-4 text-right font-semibold ${
                                                    pnl >= 0
                                                        ? "text-[var(--color-success-700)]"
                                                        : "text-[var(--color-error-700)]"
                                                }`}
                                            >
                                                {pnl ? pnl.toFixed(2) : "-"}
                                            </td>
                                            <td
                                                className={`px-4 py-4 text-right font-semibold ${
                                                    pnlPct >= 0
                                                        ? "text-[var(--color-success-700)]"
                                                        : "text-[var(--color-error-700)]"
                                                }`}
                                            >
                                                {pnlPct ? `${pnlPct.toFixed(2)}%` : "-"}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    className="px-3 py-1.5 text-sm"
                                                    onClick={() => onDelete?.(symbol)}
                                                    disabled={saving}
                                                >
                                                    Remove
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

            {open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/45 p-4">
                    <Card className="w-full max-w-md">
                        <h3 className="text-xl font-semibold text-[var(--text-main)]">Add investment</h3>
                        <div className="mt-5 space-y-4">
                            <Field label="Symbol">
                                <Input
                                    autoFocus
                                    value={form.symbol}
                                    onChange={handleChange("symbol")}
                                />
                            </Field>
                            <Field label="Quantity">
                                <Input
                                    type="number"
                                    value={form.quantity}
                                    onChange={handleChange("quantity")}
                                />
                            </Field>
                            <Field label="Avg cost">
                                <Input
                                    type="number"
                                    value={form.avgCost}
                                    onChange={handleChange("avgCost")}
                                />
                            </Field>
                            <Field label="Currency">
                                <Input value={form.currency} onChange={handleChange("currency")} />
                            </Field>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </Card>
                </div>
            ) : null}
        </>
    );
}
