const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function getLocalDateInputValue(date = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function transactionDateToUtcIso(dateValue, endOfDay = false) {
    if (!dateValue) {
        return "";
    }

    const match = DATE_KEY_PATTERN.exec(dateValue);
    if (!match) {
        return "";
    }

    const time = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    return `${match[1]}-${match[2]}-${match[3]}${time}`;
}

export function getTransactionDateKey(value) {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        const match = DATE_KEY_PATTERN.exec(value);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
}

export function getTransactionMonthKey(value) {
    return getTransactionDateKey(value).slice(0, 7);
}

export function getTransactionTimestamp(value) {
    const dateKey = getTransactionDateKey(value);
    if (!dateKey) {
        return 0;
    }

    return Date.parse(`${dateKey}T00:00:00.000Z`);
}

export function formatTransactionDate(value) {
    const dateKey = getTransactionDateKey(value);
    if (!dateKey) {
        return value || "";
    }

    const date = new Date(`${dateKey}T00:00:00.000Z`);
    return date.toLocaleDateString(undefined, { timeZone: "UTC" });
}
