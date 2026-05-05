import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(value, currency = "CAD", digits = 0) {
    return Number(value || 0).toLocaleString("en-CA", {
        style: "currency",
        currency,
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    });
}

export function formatCurrencyBreakdown(entries, digits = 0) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return formatCurrency(0, "CAD", digits);
    }

    return entries
        .filter((entry) => entry && Number.isFinite(Number(entry.amount)))
        .map((entry) => formatCurrency(entry.amount, entry.currency || "CAD", digits))
        .join(" + ");
}

export function formatDateTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
