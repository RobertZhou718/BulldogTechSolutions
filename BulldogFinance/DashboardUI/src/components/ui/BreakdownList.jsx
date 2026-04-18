import React from "react";
import { BREAKDOWN_COLORS } from "./breakdownColors.js";

export default function BreakdownList({ items }) {
    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div
                    key={item.id ?? item.label ?? index}
                    className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--bg-main)] px-4 py-3"
                >
                    <div className="flex items-center gap-3">
                        <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color ?? BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length] }}
                        />
                        <div>
                            <p className="text-sm font-medium text-[var(--text-main)]">
                                {item.label}
                            </p>
                            {item.description ? (
                                <p className="text-sm text-[var(--text-soft)]">
                                    {item.description}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                        {item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
