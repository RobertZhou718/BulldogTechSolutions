export function cn(...values) {
    return values.filter(Boolean).join(" ");
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
