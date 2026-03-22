import React from "react";
import { cn } from "@/lib/utils";

const variants = {
    primary:
        "bg-[var(--accent)] text-white hover:bg-[#175cd3] focus-visible:outline-[#175cd3]",
    secondary:
        "border border-[var(--card-border)] bg-white text-[var(--text-main)] hover:bg-[var(--bg-elevated)] focus-visible:outline-[var(--accent)]",
    ghost:
        "bg-transparent text-[var(--text-main)] hover:bg-[var(--accent-soft)] focus-visible:outline-[var(--accent)]",
    danger:
        "bg-[var(--color-error-500)] text-white hover:bg-[#d92d20] focus-visible:outline-[#d92d20]",
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
                "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
