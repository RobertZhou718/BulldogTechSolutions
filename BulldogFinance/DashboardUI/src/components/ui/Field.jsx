import React from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }) {
    return (
        <label className={cn("flex flex-col gap-1.5", className)}>
            {label ? <span className="text-sm font-medium text-[var(--text-main)]">{label}</span> : null}
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
            className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text-main)] shadow-xs outline-none transition placeholder:text-[var(--text-soft)] focus:border-[#84caff] focus:ring-4 focus:ring-[#d1e9ff]"
            {...props}
        />
    );
}

export function Select(props) {
    return (
        <select
            className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text-main)] shadow-xs outline-none transition focus:border-[#84caff] focus:ring-4 focus:ring-[#d1e9ff]"
            {...props}
        />
    );
}

export function Textarea(props) {
    return (
        <textarea
            className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--text-main)] shadow-xs outline-none transition placeholder:text-[var(--text-soft)] focus:border-[#84caff] focus:ring-4 focus:ring-[#d1e9ff]"
            {...props}
        />
    );
}
