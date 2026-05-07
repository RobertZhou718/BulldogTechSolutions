import React, { useMemo, useState } from "react";
import { Plus, Trash01 } from "@untitledui/icons";
import { getAccountBalanceDisplay } from "@/lib/accountBalances.js";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import ConnectBankButton from "@/components/plaid/ConnectBankButton.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/Field.jsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_VISIBLE_COUNT = 3;

const ACCOUNT_TYPES = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank account" },
    { value: "credit", label: "Credit card" },
    { value: "investment", label: "Investment" },
];

const CURRENCIES = ["CAD", "USD", "CNY", "EUR"];

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

function getTimestampLabel(value, fallback = "Pending first sync") {
    const formatted = formatDateTime(value);
    return formatted || fallback;
}

function needsPlaidReconnect(account) {
    if (account.externalSource !== "Plaid") {
        return false;
    }

    const itemStatus = String(account.plaidItemStatus || "").toUpperCase();
    const syncStatus = String(account.lastSyncStatus || "").toUpperCase();
    const errorCode = String(account.lastSyncErrorCode || "").toUpperCase();
    const errorText = String(account.lastSyncError || "").toUpperCase();

    return (
        itemStatus === "ERROR" ||
        syncStatus === "RELINK_REQUIRED" ||
        errorCode === "ITEM_LOGIN_REQUIRED" ||
        errorText.includes("ITEM_LOGIN_REQUIRED")
    );
}

export default function ConnectedAccountsCard({
    accounts,
    defaultCurrency = "CAD",
    onCreateManualAccount,
    onPlaidConnected,
    onDeleteAccount,
}) {
    const [expanded, setExpanded] = useState(false);
    const [pendingAccount, setPendingAccount] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [form, setForm] = useState({
        name: "",
        type: "cash",
        currency: defaultCurrency,
        initialBalance: "",
    });

    const hiddenCount = Math.max(accounts.length - DEFAULT_VISIBLE_COUNT, 0);
    const visibleAccounts = useMemo(
        () => (expanded ? accounts : accounts.slice(0, DEFAULT_VISIBLE_COUNT)),
        [accounts, expanded]
    );
    const reconnectRequiredAccounts = useMemo(
        () => accounts.filter((account) => needsPlaidReconnect(account) && account.plaidItemId),
        [accounts]
    );
    const firstReconnectAccount = reconnectRequiredAccounts[0];

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

    const handleFormChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!form.name.trim()) {
            setFormError("Account name is required.");
            return;
        }

        try {
            setSaving(true);
            await onCreateManualAccount?.({
                name: form.name.trim(),
                type: form.type,
                currency: form.currency || defaultCurrency,
                initialBalance: parseFloat(form.initialBalance || "0") || 0,
            });

            setForm({
                name: "",
                type: "cash",
                currency: defaultCurrency,
                initialBalance: "",
            });
            setShowAddForm(false);
        } catch (e) {
            setFormError(e.message || "Failed to add account.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="xl:col-span-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                        Accounts
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                        Connected and manual accounts
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Review each account source, institution, and balance position.
                        Connect another bank or add a manual account at any time.
                        Current total: {accounts.length} {accounts.length === 1 ? "account" : "accounts"}.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-end">
                    <ConnectBankButton onConnected={onPlaidConnected} />
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowAddForm((current) => !current);
                            setFormError("");
                        }}
                        className="group h-10 w-full min-w-[12.5rem] justify-center gap-2 rounded-full border border-[var(--brand-outline)] bg-[var(--brand-soft)] px-5 text-sm font-semibold text-[var(--brand)] shadow-[0_1px_0_rgba(16,24,40,0.02)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/12 hover:text-[var(--brand-strong)] hover:shadow-[0_8px_20px_-10px_rgba(21,112,239,0.4)] active:translate-y-0 sm:w-auto"
                    >
                        <Plus
                            className={cn(
                                "size-4 transition-transform duration-300",
                                showAddForm ? "rotate-45" : "group-hover:rotate-90"
                            )}
                        />
                        {showAddForm ? "Cancel" : "Add manual account"}
                    </Button>
                </div>
            </div>

            {firstReconnectAccount ? (
                <Alert className="mt-6 border-[var(--color-warning-100)] bg-[var(--color-warning-50)] text-[var(--color-warning-700)]">
                    <AlertDescription className="gap-3 text-[var(--color-warning-700)] sm:flex sm:items-center sm:justify-between">
                        <span>
                            {firstReconnectAccount.institutionName || "A bank connection"} needs to be reconnected before Plaid sync can continue.
                        </span>
                        <ConnectBankButton
                            itemId={firstReconnectAccount.plaidItemId}
                            label="Reconnect"
                            onConnected={onPlaidConnected}
                            buttonClassName="h-8 w-auto min-w-0 px-3 text-xs shadow-none hover:translate-y-0"
                        />
                    </AlertDescription>
                </Alert>
            ) : null}

            {showAddForm ? (
                <form
                    onSubmit={handleFormSubmit}
                    className="mt-6 border-t border-[var(--card-border)] pt-6"
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1.2fr_1fr_1fr_auto]">
                        <Field label="Account name">
                            <Input
                                value={form.name}
                                onChange={(e) => handleFormChange("name", e.target.value)}
                                placeholder="Emergency fund"
                            />
                        </Field>

                        <Field label="Type">
                            <Select
                                value={form.type}
                                onValueChange={(value) => handleFormChange("type", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACCOUNT_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label="Currency">
                            <Select
                                value={form.currency || defaultCurrency}
                                onValueChange={(value) => handleFormChange("currency", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((currency) => (
                                        <SelectItem key={currency} value={currency}>
                                            {currency}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field label={form.type === "credit" ? "Initial amount owed" : "Initial balance"}>
                            <Input
                                type="number"
                                value={form.initialBalance}
                                onChange={(e) => handleFormChange("initialBalance", e.target.value)}
                                placeholder="0.00"
                            />
                        </Field>

                        <div className="flex items-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? "Adding..." : "Add account"}
                            </Button>
                        </div>
                    </div>

                    {formError ? (
                        <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                    ) : null}
                </form>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)]">
                <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1.2fr_1.1fr_auto] gap-4 bg-[var(--bg-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)] md:grid">
                    <span>Account</span>
                    <span>Source</span>
                    <span>Institution</span>
                    <span>Available</span>
                    <span className="text-right">Balance</span>
                    <span className="text-right">Delete</span>
                </div>

                <div className="divide-y divide-[var(--card-border)]">
                    {visibleAccounts.map((account) => {
                        const balance = getAccountBalanceDisplay(account);
                        const requiresReconnect = needsPlaidReconnect(account);

                        return (
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
                                    {account.externalSource === "Plaid" ? (
                                        <p
                                            className={cn(
                                                "mt-2 text-xs",
                                                requiresReconnect
                                                    ? "font-medium text-[var(--color-warning-700)]"
                                                    : "text-[var(--text-soft)]"
                                            )}
                                        >
                                            {requiresReconnect
                                                ? "Reconnect required"
                                                : `Transactions: ${getTimestampLabel(account.lastTransactionSyncUtc)}`}
                                        </p>
                                    ) : null}
                                    {requiresReconnect && account.plaidItemId ? (
                                        <ConnectBankButton
                                            itemId={account.plaidItemId}
                                            label="Reconnect"
                                            onConnected={onPlaidConnected}
                                            className="mt-2"
                                            buttonClassName="h-8 w-auto min-w-0 px-3 text-xs shadow-none hover:translate-y-0"
                                        />
                                    ) : null}
                                </div>

                                <div>
                                    <p className="text-sm text-[var(--text-main)]">
                                        {account.institutionName || "Added manually"}
                                    </p>
                                </div>

                                <div>
                                    <p
                                        className={cn(
                                            "text-sm",
                                            balance.availableTone === "negative"
                                                ? "text-[var(--color-error-700)]"
                                                : "text-[var(--text-main)]"
                                        )}
                                    >
                                        {balance.hasAvailableValue
                                            ? formatCurrency(balance.availableValue, account.currency, 2)
                                            : "N/A"}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                                        {balance.availableLabel}
                                    </p>
                                </div>

                                <div className="text-left md:text-right">
                                    <p
                                        className={cn(
                                            "font-semibold",
                                            balance.balanceTone === "negative"
                                                ? "text-[var(--color-error-700)]"
                                                : balance.balanceTone === "positive"
                                                  ? "text-[var(--color-success-700)]"
                                                  : "text-[var(--text-main)]"
                                        )}
                                    >
                                        {formatCurrency(balance.balanceValue, account.currency, 2)}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                                        {balance.balanceLabel} • {account.currency}
                                    </p>
                                    {account.externalSource === "Plaid" ? (
                                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                                            Balance: {getTimestampLabel(account.lastBalanceRefreshUtc)}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex justify-start md:justify-end">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full"
                                                onClick={() => setPendingAccount(account)}
                                                aria-label={`Delete ${account.name}`}
                                            >
                                                <Trash01 className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete {account.name}</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        );
                    })}
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

            <Dialog
                open={Boolean(pendingAccount)}
                onOpenChange={(open) => {
                    if (!open) closeConfirm();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete {pendingAccount?.name}?</DialogTitle>
                        <DialogDescription>
                            {isPlaidPending
                                ? "We'll disconnect this account and stop syncing new transactions."
                                : "We'll disconnect this account and stop tracking new activity."}
                        </DialogDescription>
                    </DialogHeader>
                    {isPlaidPending ? (
                        <p className="text-sm text-muted-foreground">
                            {isLastPlaidForInstitution
                                ? `This is your last linked account at ${pendingAccount.institutionName || "this institution"}, so we'll also disconnect from the institution.`
                                : `Your other accounts at ${pendingAccount.institutionName || "this institution"} will stay connected.`}
                        </p>
                    ) : null}
                    <DialogFooter>
                        <Button variant="ghost" onClick={closeConfirm} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            loading={isDeleting}
                            loadingText="Deleting..."
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
