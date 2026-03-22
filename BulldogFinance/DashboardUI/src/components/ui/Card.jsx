import React from "react";
import { cn } from "@/lib/utils";

export default function Card({ className, children }) {
    return (
        <section
            className={cn(
                "rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm",
                className
            )}
        >
            {children}
        </section>
    );
}
