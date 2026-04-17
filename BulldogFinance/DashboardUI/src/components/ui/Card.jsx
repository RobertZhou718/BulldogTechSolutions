import React from "react";
import { cn } from "@/lib/utils";

export default function Card({ className, children }) {
    return (
        <section
            className={cn(
                "rounded-[var(--radius-2xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--surface-shadow)] ring-1 ring-white/70 backdrop-blur-sm",
                className
            )}
        >
            {children}
        </section>
    );
}
