import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/Field.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import { formatCurrency, formatCurrencyBreakdown, formatDateTime } from "@/lib/utils";

const quantityFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
});

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
        const byCurrency = new Map();
        list.forEach((h) => {
            const currency = h.Currency ?? h.currency ?? "USD";
            const current = byCurrency.get(currency) ?? { currency, marketValue: 0, pnl: 0 };
            current.marketValue += h.MarketValue ?? h.marketValue ?? 0;
            current.pnl += h.UnrealizedPnL ?? h.unrealizedPnL ?? 0;
            byCurrency.set(currency, current);
        });

        const entries = Array.from(byCurrency.values());
        return {
            marketValue: formatCurrencyBreakdown(
                entries.map((entry) => ({ currency: entry.currency, amount: entry.marketValue })),
                2
            ),
            pnl: formatCurrencyBreakdown(
                entries.map((entry) => ({ currency: entry.currency, amount: entry.pnl })),
                2
            ),
        };
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
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                            Portfolio
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                            Investments
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            Total MV: {totals.marketValue} · PnL: {totals.pnl}
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
                                    <th className="px-4 py-3">Account</th>
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
                                    const holdingId = h.HoldingId ?? h.holdingId ?? symbol;
                                    const source = h.Source ?? h.source ?? "Manual";
                                    const securityName = h.SecurityName ?? h.securityName;
                                    const accountName = h.AccountName ?? h.accountName;
                                    const institutionName = h.InstitutionName ?? h.institutionName;
                                    const qty = h.Quantity ?? h.quantity ?? 0;
                                    const avgCost = h.AvgCost ?? h.avgCost ?? 0;
                                    const price = h.CurrentPrice ?? h.currentPrice ?? 0;
                                    const priceAsOf = h.PriceAsOfUtc ?? h.priceAsOfUtc;
                                    const currency = h.Currency ?? h.currency ?? "USD";
                                    const mv = h.MarketValue ?? h.marketValue ?? qty * price;
                                    const pnl = h.UnrealizedPnL ?? h.unrealizedPnL ?? 0;
                                    const pnlPct = h.UnrealizedPnLPercent ?? h.unrealizedPnLPercent ?? 0;
                                    const canDelete = h.CanDelete ?? h.canDelete ?? source !== "Plaid";

                                    return (
                                        <tr key={holdingId}>
                                            <td className="px-4 py-4 font-semibold text-[var(--text-main)]">
                                                <div>
                                                    <p>{symbol}</p>
                                                    {securityName ? (
                                                        <p className="mt-1 max-w-48 truncate text-xs font-normal text-[var(--text-soft)]">
                                                            {securityName}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm text-[var(--text-main)]">
                                                    {accountName || source}
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--text-soft)]">
                                                    {institutionName || source}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-right">{quantityFormatter.format(qty)}</td>
                                            <td className="px-4 py-4 text-right">{avgCost ? formatCurrency(avgCost, currency, 2) : "-"}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div>
                                                    <p>{price ? formatCurrency(price, currency, 2) : "-"}</p>
                                                    {priceAsOf ? (
                                                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                                                            {formatDateTime(priceAsOf)}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">{mv ? formatCurrency(mv, currency, 2) : "-"}</td>
                                            <td
                                                className={`px-4 py-4 text-right font-semibold ${
                                                    pnl >= 0
                                                        ? "text-[var(--color-success-700)]"
                                                        : "text-[var(--color-error-700)]"
                                                }`}
                                            >
                                                {pnl ? formatCurrency(pnl, currency, 2) : "-"}
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
                                                {canDelete ? (
                                                    <Button
                                                        variant="ghost"
                                                        className="px-3 py-1.5 text-sm"
                                                        onClick={() => onDelete?.(symbol)}
                                                        disabled={saving}
                                                    >
                                                        Remove
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-[var(--text-soft)]">Plaid sync</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog
                open={open}
                onOpenChange={(next) => {
                    if (!saving) setOpen(next);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add investment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
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
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={saving}
                            loadingText="Saving..."
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
