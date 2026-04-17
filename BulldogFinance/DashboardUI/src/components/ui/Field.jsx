import React from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }) {
    return (
        <label className={cn("flex flex-col gap-1.5", className)}>
            {label ? <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span> : null}
            {children}
            {error ? (
                <span className="text-sm text-[var(--color-error-500)]">{error}</span>
            ) : hint ? (
                <span className="text-sm text-[var(--text-soft)]">{hint}</span>
            ) : null}
        </label>
    );
}

export function Input(props) {
    return (
        <input
            className="w-full rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg-strong)] px-3.5 py-2.5 text-sm text-[var(--text-main)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--text-soft)] hover:border-[var(--card-border-strong)] focus:border-[var(--color-brand-300)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            {...props}
        />
    );
}

export function Select(props) {
    return (
        <select
            className="w-full rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg-strong)] px-3.5 py-2.5 text-sm text-[var(--text-main)] shadow-[var(--shadow-xs)] outline-none transition hover:border-[var(--card-border-strong)] focus:border-[var(--color-brand-300)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            {...props}
        />
    );
}

export function Textarea(props) {
    return (
        <textarea
            className="w-full rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg-strong)] px-3.5 py-2.5 text-sm text-[var(--text-main)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--text-soft)] hover:border-[var(--card-border-strong)] focus:border-[var(--color-brand-300)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            {...props}
        />
    );
}
