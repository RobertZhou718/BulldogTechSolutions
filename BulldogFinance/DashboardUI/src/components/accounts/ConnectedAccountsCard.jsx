import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Trash01 } from "@untitledui/icons";
import Button from "@/components/ui/Button.jsx";
import Card from "@/components/ui/Card.jsx";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_VISIBLE_COUNT = 3;

function getSourceLabel(account) {
    return account.externalSource === "Plaid" ? "Plaid" : "Manual";
}

function getTypeLabel(account) {
    if (!account.type) {
        return "Account";
    }

    return String(account.type)
        .split(":")
        .filter(Boolean)
        .map((part) => part.replace(/_/g, " "))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" / ");
}

export default function ConnectedAccountsCard({ accounts, onDeleteAccount }) {
    const [expanded, setExpanded] = useState(false);
    const [pendingAccount, setPendingAccount] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const hiddenCount = Math.max(accounts.length - DEFAULT_VISIBLE_COUNT, 0);
    const visibleAccounts = useMemo(
        () => (expanded ? accounts : accounts.slice(0, DEFAULT_VISIBLE_COUNT)),
        [accounts, expanded]
    );

    const isPlaidPending = pendingAccount?.externalSource === "Plaid";
    const remainingPlaidForItem = isPlaidPending
        ? accounts.filter(
              (a) =>
                  a.externalSource === "Plaid" &&
                  a.institutionName === pendingAccount.institutionName &&
                  a.accountId !== pendingAccount.accountId
          ).length
        : 0;
    const isLastPlaidForInstitution = isPlaidPending && remainingPlaidForItem === 0;

    const closeConfirm = () => {
        if (isDeleting) return;
        setPendingAccount(null);
    };

    const confirmDelete = async () => {
        if (!pendingAccount || isDeleting) return;
        setIsDeleting(true);
        try {
            await onDeleteAccount?.(pendingAccount.accountId);
            setPendingAccount(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="xl:col-span-12">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                        Accounts
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                        Connected and manual accounts
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Review each account source, institution, and current balance in one place.
                    </p>
                </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)]">
                <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1.2fr_1.1fr_auto] gap-4 bg-[var(--bg-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)] md:grid">
                    <span>Account</span>
                    <span>Source</span>
                    <span>Institution</span>
                    <span>Available</span>
                    <span className="text-right">Current</span>
                    <span className="text-right">Delete</span>
                </div>

                <div className="divide-y divide-[var(--card-border)]">
                    {visibleAccounts.map((account) => (
                        <div
                            key={account.accountId}
                            className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1.2fr_1.1fr_auto] md:items-center md:gap-4"
                        >
                            <div>
                                <p className="font-semibold text-[var(--text-main)]">{account.name}</p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    {getTypeLabel(account)}
                                    {account.mask ? ` •••• ${account.mask}` : ""}
                                </p>
                            </div>

                            <div>
                                <span className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--card-bg-strong)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                                    {getSourceLabel(account)}
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-[var(--text-main)]">
                                    {account.institutionName || "Added manually"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-[var(--text-main)]">
                                    {account.availableBalance != null
                                        ? formatCurrency(account.availableBalance, account.currency, 2)
                                        : "N/A"}
                                </p>
                            </div>

                            <div className="text-left md:text-right">
                                <p className="font-semibold text-[var(--text-main)]">
                                    {formatCurrency(account.currentBalance, account.currency, 2)}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-soft)]">{account.currency}</p>
                            </div>

                            <div className="flex justify-start md:justify-end">
                                <Button
                                    variant="ghost"
                                    className="min-h-10 min-w-10 rounded-full px-0 py-0"
                                    onClick={() => setPendingAccount(account)}
                                    aria-label={`Delete ${account.name}`}
                                    title={`Delete ${account.name}`}
                                >
                                    <Trash01 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {hiddenCount > 0 ? (
                <div className="mt-4 flex justify-end">
                    <Button
                        variant="ghost"
                        className="min-h-10 rounded-full px-3"
                        onClick={() => setExpanded((current) => !current)}
                    >
                        {expanded ? "Collapse" : `+${hiddenCount} more`}
                    </Button>
                </div>
            ) : null}

            {pendingAccount && typeof document !== "undefined"
                ? createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-title"
                    onClick={closeConfirm}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3
                            id="delete-account-title"
                            className="text-lg font-semibold text-[var(--text-main)]"
                        >
                            Delete {pendingAccount.name}?
                        </h3>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            {isPlaidPending
                                ? "We'll disconnect this account and stop syncing new transactions."
                                : "We'll disconnect this account and stop tracking new activity."}
                        </p>
                        {isPlaidPending ? (
                            <p className="mt-3 text-sm text-[var(--text-muted)]">
                                {isLastPlaidForInstitution
                                    ? `This is your last linked account at ${pendingAccount.institutionName || "this institution"}, so we'll also disconnect from the institution.`
                                    : `Your other accounts at ${pendingAccount.institutionName || "this institution"} will stay connected.`}
                            </p>
                        ) : null}
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                className="min-h-10 rounded-full px-4"
                                onClick={closeConfirm}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="min-h-10 rounded-full bg-red-600 px-4 text-white hover:bg-red-700"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )
                : null}
        </Card>
    );
}
