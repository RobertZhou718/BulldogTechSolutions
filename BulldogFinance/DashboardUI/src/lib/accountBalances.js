const CASH_PRIMARY_TYPES = new Set(["cash", "bank", "depository"]);
const INVESTMENT_PRIMARY_TYPES = new Set(["investment", "brokerage"]);
const CREDIT_PRIMARY_TYPES = new Set(["credit"]);
const LOAN_PRIMARY_TYPES = new Set(["loan"]);

function numberOrZero(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function numberOrNull(value) {
    if (value == null) return null;

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function createCurrencyBucket(currency) {
    return {
        currency,
        netWorth: 0,
    };
}

function buildEntries(buckets, property, defaultCurrency) {
    const entries = buckets
        .map((bucket) => ({
            currency: bucket.currency,
            amount: bucket[property],
        }));

    if (entries.length > 0) {
        return entries;
    }

    return [{ currency: defaultCurrency, amount: 0 }];
}

export function normalizeAccountType(type) {
    return String(type || "")
        .trim()
        .toLowerCase()
        .replace(/_/g, " ");
}

export function getPrimaryAccountType(accountOrType) {
    const type = typeof accountOrType === "string"
        ? accountOrType
        : accountOrType?.type;

    return normalizeAccountType(type).split(":")[0] || "";
}

export function isCreditAccount(account) {
    return CREDIT_PRIMARY_TYPES.has(getPrimaryAccountType(account));
}

export function getAccountBalanceDisplay(account) {
    const primaryType = getPrimaryAccountType(account);
    const currentBalance = numberOrZero(account?.currentBalance);
    const availableBalance = numberOrNull(account?.availableBalance);
    const isCredit = CREDIT_PRIMARY_TYPES.has(primaryType);
    const isLoan = LOAN_PRIMARY_TYPES.has(primaryType);
    const isInvestment = INVESTMENT_PRIMARY_TYPES.has(primaryType);
    const isCash = CASH_PRIMARY_TYPES.has(primaryType) || !primaryType;

    if (isCredit) {
        const amountOwed = Math.max(currentBalance, 0);
        const creditBalance = Math.max(-currentBalance, 0);

        return {
            kind: "credit",
            isCredit: true,
            balanceLabel: creditBalance > 0 ? "Credit balance" : "Amount owed",
            balanceValue: creditBalance > 0 ? creditBalance : amountOwed,
            balanceTone: amountOwed > 0 ? "negative" : creditBalance > 0 ? "positive" : "default",
            availableLabel: "Available credit",
            availableValue: availableBalance,
            availableTone: availableBalance != null && availableBalance < 0 ? "negative" : "default",
            hasAvailableValue: availableBalance != null,
            signedBalance: creditBalance - amountOwed,
            assetBalance: creditBalance,
            liabilityBalance: amountOwed,
        };
    }

    if (isLoan) {
        const amountOwed = Math.max(currentBalance, 0);
        const overpaymentBalance = Math.max(-currentBalance, 0);

        return {
            kind: "loan",
            isCredit: false,
            balanceLabel: overpaymentBalance > 0 ? "Credit balance" : "Amount owed",
            balanceValue: overpaymentBalance > 0 ? overpaymentBalance : amountOwed,
            balanceTone: amountOwed > 0 ? "negative" : overpaymentBalance > 0 ? "positive" : "default",
            availableLabel: "Available",
            availableValue: availableBalance,
            availableTone: availableBalance != null && availableBalance < 0 ? "negative" : "default",
            hasAvailableValue: availableBalance != null,
            signedBalance: overpaymentBalance - amountOwed,
            assetBalance: overpaymentBalance,
            liabilityBalance: amountOwed,
        };
    }

    const positiveAsset = Math.max(currentBalance, 0);
    const liabilityBalance = Math.max(-currentBalance, 0);

    return {
        kind: isInvestment ? "investment" : isCash ? "cash" : "asset",
        isCredit: false,
        balanceLabel: isInvestment ? "Market value" : "Current balance",
        balanceValue: currentBalance,
        balanceTone: currentBalance < 0 ? "negative" : "default",
        availableLabel: "Available",
        availableValue: availableBalance,
        availableTone: availableBalance != null && availableBalance < 0 ? "negative" : "default",
        hasAvailableValue: availableBalance != null,
        signedBalance: currentBalance,
        assetBalance: positiveAsset,
        liabilityBalance,
    };
}

export function summarizeAccountBalances(accounts = [], defaultCurrency = "CAD") {
    const bucketsByCurrency = new Map();

    accounts.forEach((account) => {
        const currency = account?.currency || defaultCurrency;
        const bucket = bucketsByCurrency.get(currency) ?? createCurrencyBucket(currency);
        const balance = getAccountBalanceDisplay(account);

        bucket.netWorth += balance.signedBalance;

        bucketsByCurrency.set(currency, bucket);
    });

    const byCurrency = Array.from(bucketsByCurrency.values()).sort((a, b) =>
        a.currency.localeCompare(b.currency)
    );

    return {
        byCurrency,
        netWorthEntries: buildEntries(byCurrency, "netWorth", defaultCurrency),
        hasMixedCurrencies: byCurrency.length > 1,
    };
}
