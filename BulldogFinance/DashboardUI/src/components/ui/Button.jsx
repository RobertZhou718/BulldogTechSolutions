import React from "react";
import { cn } from "@/lib/utils";

const variants = {
    primary:
        "border border-[var(--accent)] bg-[var(--accent)] text-white hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] focus-visible:outline-[var(--accent)]",
    secondary:
        "border border-[var(--card-border)] bg-[var(--card-bg-strong)] text-[var(--text-muted)] hover:border-[var(--card-border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] focus-visible:outline-[var(--accent)]",
    ghost:
        "border border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] focus-visible:outline-[var(--accent)]",
    danger:
        "border border-[var(--color-error-500)] bg-[var(--color-error-500)] text-white hover:border-[#d92d20] hover:bg-[#d92d20] focus-visible:outline-[#d92d20]",
};

export default function Button({
    children,
    className,
    variant = "primary",
    type = "button",
    ...props
}) {
    return (
        <button
            type={type}
            className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-lg)] px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-xs)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[var(--card-border)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-disabled)] disabled:opacity-100",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
