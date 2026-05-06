import React, { useMemo } from "react";
import Card from "@/components/ui/Card.jsx";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getTransactionDateKey } from "@/lib/transactionDates.js";

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

function buildSampleTransactions(referenceDate = new Date()) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const makeIso = (day) =>
        new Date(year, month, Math.min(day, daysInMonth), 12, 0, 0, 0).toISOString();

    return [
        { transactionId: "sample-income-1", type: "INCOME", amount: 3200, occurredAtUtc: makeIso(2) },
        { transactionId: "sample-expense-1", type: "EXPENSE", amount: 48, occurredAtUtc: makeIso(4) },
        { transactionId: "sample-expense-2", type: "EXPENSE", amount: 126, occurredAtUtc: makeIso(8) },
        { transactionId: "sample-income-2", type: "INCOME", amount: 450, occurredAtUtc: makeIso(11) },
        { transactionId: "sample-expense-3", type: "EXPENSE", amount: 980, occurredAtUtc: makeIso(15) },
        { transactionId: "sample-expense-4", type: "EXPENSE", amount: 72, occurredAtUtc: makeIso(19) },
        { transactionId: "sample-income-3", type: "INCOME", amount: 680, occurredAtUtc: makeIso(23) },
        { transactionId: "sample-expense-5", type: "EXPENSE", amount: 210, occurredAtUtc: makeIso(27) },
    ];
}

export default function DailyCashFlowCalendar({ transactions = [] }) {
    const sampleTransactions = useMemo(() => buildSampleTransactions(), []);
    const usingSampleData = import.meta.env.DEV && transactions.length === 0;
    const displayTransactions = usingSampleData ? sampleTransactions : transactions;

    const cashFlowByDate = useMemo(() => {
        const map = new Map();
        displayTransactions.forEach((tx) => {
            const occurredAt = tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc;
            if (!occurredAt) return;

            const key = getTransactionDateKey(occurredAt);
            if (!key) return;

            const amount = Number(tx.amount) || 0;
            const signed =
                tx.type === "INCOME" ? amount : tx.type === "EXPENSE" ? -amount : 0;
            map.set(key, (map.get(key) ?? 0) + signed);
        });
        return map;
    }, [displayTransactions]);

    const Day = ({ day, modifiers, className, ...props }) => {
        const key = formatDateKey(day.date);
        const hasData = cashFlowByDate.has(key);
        const amount = cashFlowByDate.get(key) ?? 0;
        const isPositive = hasData && amount > 0;
        const isNegative = hasData && amount < 0;

        return (
            <td
                data-day={day.date.toLocaleDateString()}
                className={cn(
                    className
                )}
                {...props}
            >
                {modifiers.hidden ? null : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 px-0 leading-none font-normal">
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
                    </div>
                )}
            </td>
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
                <p className="mt-2 text-sm text-[var(--text-muted)] truncate">
                    Net income by day{usingSampleData ? " (sample data)" : ""}.
                </p>
            </div>
            <div className="mt-4 flex w-full justify-center">
                <Calendar
                    className="[--cell-size:--spacing(10)] w-full p-0"
                    classNames={{ root: "w-full" }}
                    components={{ Day }}
                />
            </div>
        </Card>
    );
}
