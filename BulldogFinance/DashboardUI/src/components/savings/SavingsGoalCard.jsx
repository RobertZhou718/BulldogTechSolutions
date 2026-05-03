import React, { useMemo, useState } from "react";
import { Archive, LockKeyhole, Pencil, Plus, Sparkles, Target } from "lucide-react";
import BulldogPiggyBank from "@/components/savings/BulldogPiggyBank.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/Card.jsx";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatCurrency } from "@/lib/utils";

const DEFAULT_ACCOUNT_TYPES = ["cash", "bank"];
const GOAL_MODES = [
    { value: "total_balance", label: "Total balance" },
    { value: "new_savings", label: "New savings" },
];
const ACCOUNT_TYPE_OPTIONS = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank" },
    { value: "investment", label: "Investment" },
];

function normalizeType(type) {
    return String(type || "").trim().toLowerCase();
}

function accountTypeMatches(accountType, includedTypes) {
    const normalized = normalizeType(accountType);
    if (!normalized) return false;

    if (includedTypes.has(normalized)) return true;

    const [primaryType] = normalized.split(":");
    return (
        includedTypes.has(primaryType) ||
        (includedTypes.has("bank") && primaryType === "depository") ||
        (includedTypes.has("investment") && primaryType === "investment")
    );
}

function getInitialForm(goal, defaultCurrency) {
    if (goal) {
        return {
            name: goal.name || "",
            targetAmount: String(goal.targetAmount ?? ""),
            currency: goal.currency || defaultCurrency,
            mode: goal.mode || "total_balance",
            includedAccountTypes:
                goal.includedAccountTypes?.length > 0
                    ? goal.includedAccountTypes
                    : DEFAULT_ACCOUNT_TYPES,
        };
    }

    return {
        name: "",
        targetAmount: "",
        currency: defaultCurrency,
        mode: "total_balance",
        includedAccountTypes: DEFAULT_ACCOUNT_TYPES,
    };
}

function formatDateTime(value) {
    if (!value) return null;

    return new Date(value).toLocaleString("en-CA", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function SavingsGoalCard({
    goal,
    accounts,
    defaultCurrency = "CAD",
    onCreateGoal,
    onUpdateGoal,
    onArchiveGoal,
}) {
    const [dialogMode, setDialogMode] = useState(null);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [form, setForm] = useState(() => getInitialForm(goal, defaultCurrency));

    const progressPercent = Math.max(0, Math.min(100, Number(goal?.progressPercent) || 0));
    const hasGoal = Boolean(goal);
    const progressMarkerPosition = hasGoal ? progressPercent : 0;
    const progressMarkerLabel = `${progressMarkerPosition.toFixed(0)}%`;
    const isEditing = dialogMode === "edit";
    const configLocked = isEditing && goal && !goal.canEditConfig;
    const nextEditAt = formatDateTime(goal?.nextConfigEditAtUtc);

    const availableCurrencies = useMemo(() => {
        const currencies = new Set([defaultCurrency]);
        accounts.forEach((account) => {
            if (account.currency) currencies.add(account.currency);
        });
        return Array.from(currencies).sort();
    }, [accounts, defaultCurrency]);

    const selectedAccountCount = useMemo(() => {
        const typeSet = new Set(form.includedAccountTypes.map(normalizeType));
        return accounts.filter(
            (account) =>
                account.currency === form.currency &&
                accountTypeMatches(account.type, typeSet)
        ).length;
    }, [accounts, form.currency, form.includedAccountTypes]);

    const openCreate = () => {
        setForm(getInitialForm(null, defaultCurrency));
        setFormError("");
        setDialogMode("create");
    };

    const openEdit = () => {
        setForm(getInitialForm(goal, defaultCurrency));
        setFormError("");
        setDialogMode("edit");
    };

    const closeDialog = () => {
        if (saving) return;
        setDialogMode(null);
        setFormError("");
    };

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const toggleAccountType = (type, checked) => {
        setForm((current) => {
            const types = new Set(current.includedAccountTypes);
            if (checked) {
                types.add(type);
            } else {
                types.delete(type);
            }

            return {
                ...current,
                includedAccountTypes: Array.from(types),
            };
        });
    };

    const submitGoal = async (event) => {
        event.preventDefault();
        setFormError("");

        const amount = Number(form.targetAmount);
        if (!form.name.trim()) {
            setFormError("Goal name is required.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setFormError("Target amount must be greater than zero.");
            return;
        }

        if (form.includedAccountTypes.length === 0) {
            setFormError("Choose at least one account type.");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: form.name.trim(),
                targetAmount: amount,
                currency: form.currency,
                mode: form.mode,
                includedAccountTypes: form.includedAccountTypes,
            };

            if (isEditing) {
                await onUpdateGoal?.(goal.goalId, payload);
            } else {
                await onCreateGoal?.(payload);
            }

            setDialogMode(null);
        } catch (e) {
            setFormError(e.message || "Failed to save savings goal.");
        } finally {
            setSaving(false);
        }
    };

    const archiveGoal = async () => {
        if (!goal) return;

        try {
            setSaving(true);
            await onArchiveGoal?.(goal.goalId);
            setShowArchiveDialog(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="overflow-hidden p-0 xl:col-span-12">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
                <div className="relative flex min-h-[28rem] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.95),rgba(239,244,255,0.62)_36%,rgba(209,250,223,0.42)_100%)] p-4 sm:p-6">
                    <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-white/70 blur-3xl" />
                    <div className="relative h-full min-h-[24rem] w-full">
                        <BulldogPiggyBank progressPercent={progressPercent} />
                    </div>
                </div>

                <div className="flex flex-col justify-between gap-8 border-t border-[var(--card-border)] p-6 sm:p-8 lg:border-l lg:border-t-0">
                    <div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                                    <Sparkles className="size-4" />
                                    Savings goal
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
                                    {hasGoal ? goal.name : "Start filling your bulldog bank"}
                                </h2>
                                <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
                                    {hasGoal
                                        ? "Your connected balances fill the glass bank with Bulldog coins as you move toward the target."
                                        : "Create a target and your Bulldog coin stack will grow as eligible account balances increase."}
                                </p>
                            </div>
                            {hasGoal ? (
                                <Badge
                                    variant={goal.isCompleted ? "default" : "secondary"}
                                    className={goal.isCompleted ? "bg-[var(--color-success-500)]" : ""}
                                >
                                    {goal.isCompleted ? "Reached" : GOAL_MODES.find((mode) => mode.value === goal.mode)?.label || "Goal"}
                                </Badge>
                            ) : null}
                        </div>

                        {hasGoal ? (
                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                                        Progress
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold text-[var(--text-main)]">
                                        {formatCurrency(goal.progressAmount, goal.currency, 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                                        Target
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold text-[var(--text-main)]">
                                        {formatCurrency(goal.targetAmount, goal.currency, 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                                        Remaining
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold text-[var(--text-main)]">
                                        {formatCurrency(goal.remainingAmount, goal.currency, 0)}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-7">
                            <div className="relative pt-7">
                                <div
                                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-xs font-semibold text-[var(--brand)] transition-[left] duration-700"
                                    style={{
                                        left: `clamp(1.25rem, ${progressMarkerPosition}%, calc(100% - 1.25rem))`,
                                    }}
                                >
                                    <span>{progressMarkerLabel}</span>
                                    <span className="mt-1 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-[var(--brand)]" />
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-[var(--color-gray-100)]">
                                    <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,#1570ef,#12b76a,#f79009)] transition-all duration-700"
                                        style={{ width: `${hasGoal ? progressPercent : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs font-medium text-[var(--text-soft)]">
                                {[0, 25, 50, 75, 100].map((milestone) => (
                                    <span
                                        key={milestone}
                                        className={progressPercent >= milestone ? "text-[var(--brand)]" : ""}
                                    >
                                        {milestone}%
                                    </span>
                                ))}
                            </div>
                        </div>

                        {hasGoal && !goal.canEditConfig && nextEditAt ? (
                            <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--brand-outline)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--text-muted)]">
                                <LockKeyhole className="mt-0.5 size-4 text-[var(--brand)]" />
                                <p>Goal settings are locked until {nextEditAt}. The name can still be changed.</p>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        {hasGoal ? (
                            <>
                                <Button onClick={openEdit} className="gap-2">
                                    <Pencil className="size-4" />
                                    Edit goal
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowArchiveDialog(true)}
                                    className="gap-2"
                                >
                                    <Archive className="size-4" />
                                    Archive
                                </Button>
                            </>
                        ) : (
                            <Button onClick={openCreate} className="gap-2">
                                <Plus className="size-4" />
                                Create savings goal
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Dialog
                open={Boolean(dialogMode)}
                onOpenChange={(open) => {
                    if (!open) closeDialog();
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Edit savings goal" : "Create savings goal"}</DialogTitle>
                        <DialogDescription>
                            Pick a target and the accounts that should fill the Bulldog coin bank.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitGoal} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <div className="space-y-4">
                            <Field label="Goal name">
                                <Input
                                    value={form.name}
                                    onChange={(e) => updateForm("name", e.target.value)}
                                    placeholder="Emergency fund"
                                />
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Target amount">
                                    <Input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={form.targetAmount}
                                        onChange={(e) => updateForm("targetAmount", e.target.value)}
                                        disabled={configLocked}
                                        placeholder="10000"
                                    />
                                </Field>

                                <Field label="Currency">
                                    <Select
                                        value={form.currency}
                                        onValueChange={(value) => updateForm("currency", value)}
                                        disabled={configLocked}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCurrencies.map((currency) => (
                                                <SelectItem key={currency} value={currency}>
                                                    {currency}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>

                            <Field label="Goal mode">
                                <Select
                                    value={form.mode}
                                    onValueChange={(value) => updateForm("mode", value)}
                                    disabled={configLocked}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GOAL_MODES.map((mode) => (
                                            <SelectItem key={mode.value} value={mode.value}>
                                                {mode.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div>
                                <p className="text-sm font-medium text-[var(--text-muted)]">
                                    Included account types
                                </p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                    {ACCOUNT_TYPE_OPTIONS.map((type) => (
                                        <label
                                            key={type.value}
                                            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg-strong)] px-3 text-sm font-medium text-[var(--text-main)]"
                                        >
                                            <Checkbox
                                                checked={form.includedAccountTypes.includes(type.value)}
                                                onCheckedChange={(checked) => toggleAccountType(type.value, Boolean(checked))}
                                                disabled={configLocked}
                                            />
                                            {type.label}
                                        </label>
                                    ))}
                                </div>
                                <p className="mt-2 text-sm text-[var(--text-soft)]">
                                    {selectedAccountCount} eligible {selectedAccountCount === 1 ? "account" : "accounts"} match this setup.
                                </p>
                            </div>

                            {configLocked ? (
                                <Alert>
                                    <LockKeyhole className="size-4" />
                                    <AlertDescription>
                                        Goal settings are in cooldown. Only the name will be changed right now.
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            {formError ? (
                                <Alert variant="destructive">
                                    <AlertDescription>{formError}</AlertDescription>
                                </Alert>
                            ) : null}
                        </div>

                        <div className="rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--bg-subtle)] p-4">
                            <BulldogPiggyBank progressPercent={isEditing ? progressPercent : 28} compact />
                            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                                <Target className="size-4 text-[var(--brand)]" />
                                {form.name || "Your goal"}
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {formatCurrency(Number(form.targetAmount) || 0, form.currency, 0)} target
                            </p>
                        </div>

                        <DialogFooter className="lg:col-span-2">
                            <Button type="button" variant="ghost" onClick={closeDialog} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving..." : isEditing ? "Save goal" : "Create goal"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Archive this goal?</DialogTitle>
                        <DialogDescription>
                            This removes the active goal from the dashboard so a new target can be created.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowArchiveDialog(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={archiveGoal} disabled={saving}>
                            {saving ? "Archiving..." : "Archive goal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
