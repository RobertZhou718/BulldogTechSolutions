import React, { useMemo } from "react";
import Card from "@/components/ui/Card.jsx";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatAmount(amount) {
    const abs = Math.abs(amount);
    let body;
    if (abs >= 1_000_000) {
        body = `${(abs / 1_000_000).toFixed(1)}m`;
    } else if (abs >= 1000) {
        body = `${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
    } else {
        body = `${Math.round(abs)}`;
    }
    return amount < 0 ? `-${body}` : body;
}

export default function DailyCashFlowCalendar({ transactions = [] }) {
    const cashFlowByDate = useMemo(() => {
        const map = new Map();
        transactions.forEach((tx) => {
            const occurredAt = tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc;
            if (!occurredAt) return;

            const date = new Date(occurredAt);
            if (Number.isNaN(date.getTime())) return;

            const key = formatDateKey(date);
            const amount = Number(tx.amount) || 0;
            const signed =
                tx.type === "INCOME" ? amount : tx.type === "EXPENSE" ? -amount : 0;
            map.set(key, (map.get(key) ?? 0) + signed);
        });
        return map;
    }, [transactions]);

    const DayButton = ({ day, modifiers, className, children: _children, ...props }) => {
        const key = formatDateKey(day.date);
        const hasData = cashFlowByDate.has(key);
        const amount = cashFlowByDate.get(key) ?? 0;
        const isPositive = hasData && amount > 0;
        const isNegative = hasData && amount < 0;

        return (
            <Button
                variant="ghost"
                size="icon"
                data-day={day.date.toLocaleDateString()}
                className={cn(
                    "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-0.5 px-0 leading-none font-normal",
                    className
                )}
                {...props}
            >
                <span className="text-sm">{day.date.getDate()}</span>
                <span
                    className={cn(
                        "text-[10px] tabular-nums",
                        isPositive && "text-[#12b76a]",
                        isNegative && "text-[#d92d20]",
                        !hasData && "text-[var(--text-muted)]"
                    )}
                >
                    {hasData ? formatAmount(amount) : "-"}
                </span>
            </Button>
        );
    };

    return (
        <Card className="h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                Daily cash flow
            </p>
            <div className="mt-2">
                <h2 className="text-xl font-semibold text-[var(--text-main)]">
                    Net by day
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Income minus spending for each day. Green is positive, red is negative, and "-" means no activity.
                </p>
            </div>
            <div className="mt-4 flex justify-center">
                <Calendar
                    className="[--cell-size:--spacing(14)] w-full"
                    classNames={{ root: "w-full" }}
                    components={{ DayButton }}
                />
            </div>
        </Card>
    );
}
