import React from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }) {
    return (
        <label className={cn("flex flex-col gap-1.5", className)}>
            {label ? (
                <span className="text-sm font-medium text-[var(--color-gray-700)]">{label}</span>
            ) : null}
            {children}
            {error ? (
                <span className="text-sm text-[var(--color-error-700)]">{error}</span>
            ) : hint ? (
                <span className="text-sm text-[var(--color-gray-500)]">{hint}</span>
            ) : null}
        </label>
    );
}

export function Input({ className, size = "md", ...props }) {
    const sizeClassName = size === "sm" ? "px-3 py-2" : "px-3.5 py-2.5";

    return (
        <input
            className={cn(
                "w-full rounded-lg bg-white text-sm text-[var(--color-gray-900)] shadow-[var(--shadow-xs)] ring-1 ring-inset ring-[var(--color-gray-300)] outline-none transition duration-100 ease-linear placeholder:text-[var(--color-gray-500)] hover:ring-[var(--color-gray-400)] focus:ring-2 focus:ring-[var(--color-brand-500)] disabled:cursor-not-allowed disabled:bg-[var(--color-gray-100)] disabled:text-[var(--color-gray-400)] disabled:ring-[var(--color-gray-300)]",
                sizeClassName,
                className
            )}
            {...props}
        />
    );
}

export function Select({ className, size = "md", ...props }) {
    const sizeClassName = size === "sm" ? "px-3 py-2" : "px-3.5 py-2.5";

    return (
        <select
            className={cn(
                "w-full rounded-lg bg-white text-sm text-[var(--color-gray-900)] shadow-[var(--shadow-xs)] ring-1 ring-inset ring-[var(--color-gray-300)] outline-none transition duration-100 ease-linear hover:ring-[var(--color-gray-400)] focus:ring-2 focus:ring-[var(--color-brand-500)] disabled:cursor-not-allowed disabled:bg-[var(--color-gray-100)] disabled:text-[var(--color-gray-400)] disabled:ring-[var(--color-gray-300)]",
                sizeClassName,
                className
            )}
            {...props}
        />
    );
}

export function Textarea({ className, ...props }) {
    return (
        <textarea
            className={cn(
                "w-full rounded-lg bg-white px-3.5 py-2.5 text-sm text-[var(--color-gray-900)] shadow-[var(--shadow-xs)] ring-1 ring-inset ring-[var(--color-gray-300)] outline-none transition duration-100 ease-linear placeholder:text-[var(--color-gray-500)] hover:ring-[var(--color-gray-400)] focus:ring-2 focus:ring-[var(--color-brand-500)] disabled:cursor-not-allowed disabled:bg-[var(--color-gray-100)] disabled:text-[var(--color-gray-400)] disabled:ring-[var(--color-gray-300)]",
                className
            )}
            {...props}
        />
    );
}
