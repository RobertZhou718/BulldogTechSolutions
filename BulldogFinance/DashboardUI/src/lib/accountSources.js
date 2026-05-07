export function isConnectedAccount(account) {
    return account?.externalSource?.toLowerCase() === "plaid";
}

export function isManualAccount(account) {
    return !isConnectedAccount(account);
}

export function isConnectedTransaction(transaction, account) {
    return (
        isConnectedAccount(account) ||
        transaction?.source?.toLowerCase() === "plaid"
    );
}
