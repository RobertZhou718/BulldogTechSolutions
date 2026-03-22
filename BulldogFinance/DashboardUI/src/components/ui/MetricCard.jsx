import React from "react";
import Card from "./Card.jsx";

export default function MetricCard({ label, value, hint, tone = "default" }) {
    const color =
        tone === "positive"
            ? "text-[var(--color-success-700)]"
            : tone === "negative"
              ? "text-[var(--color-error-700)]"
              : "text-[var(--text-main)]";

    return (
        <Card className="bg-gradient-to-b from-white to-[var(--bg-main)] p-5">
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className={`mt-2 text-3xl font-semibold tracking-[-0.04em] ${color}`}>{value}</p>
            {hint ? <p className="mt-2 text-sm text-[var(--text-soft)]">{hint}</p> : null}
        </Card>
    );
}
