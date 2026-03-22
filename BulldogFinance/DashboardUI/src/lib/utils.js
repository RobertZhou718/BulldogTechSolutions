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
