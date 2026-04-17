import React from "react";
import { cn } from "@/lib/utils";

export default function Spinner({ className = "" }) {
    return (
        <span
            className={cn(
                "inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-gray-200)] border-t-[var(--accent)]",
                className
            )}
            aria-hidden="true"
        />
    );
}
