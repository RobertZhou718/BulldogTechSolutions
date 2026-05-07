import React, { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Bank } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApiClient } from "@/services/apiClient";
import { toast } from "sonner";

export default function ConnectBankButton({ onConnected, className, buttonClassName, itemId, label }) {
    const { createPlaidLinkToken, exchangePlaidPublicToken, completePlaidItemUpdate } = useApiClient();
    const [linkToken, setLinkToken] = useState("");
    const [loadingToken, setLoadingToken] = useState(false);
    const [pendingOpen, setPendingOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const isUpdateMode = Boolean(itemId);

    const { open, ready } = usePlaidLink({
        token: linkToken || null,
        onSuccess: async (publicToken, metadata) => {
            setSubmitting(true);
            setLinkToken("");
            const toastId = toast.loading(
                isUpdateMode ? "Updating bank connection..." : "Linking your bank..."
            );

            try {
                if (isUpdateMode) {
                    await completePlaidItemUpdate(itemId);
                } else {
                    await exchangePlaidPublicToken({
                        publicToken,
                        institutionId: metadata?.institution?.institution_id || null,
                        institutionName: metadata?.institution?.name || null,
                    });
                }
            } catch (e) {
                toast.error(
                    e.message ||
                        (isUpdateMode
                            ? "Failed to update bank connection."
                            : "Failed to connect bank account."),
                    { id: toastId }
                );
                setSubmitting(false);
                return;
            }

            const successMessage = isUpdateMode
                ? "Bank connection updated."
                : metadata?.institution?.name
                  ? `${metadata.institution.name} connected.`
                  : "Bank connected.";

            toast.success(successMessage, { id: toastId });

            try {
                await onConnected?.();
            } catch (e) {
                // The bank link itself succeeded; don't surface a post-link refresh
                // failure as a connection error, which previously showed "API 500".
                console.error("Post-connect refresh failed", e);
            } finally {
                setSubmitting(false);
            }
        },
        onExit: (exitError) => {
            setLinkToken("");
            setPendingOpen(false);
            if (exitError?.display_message || exitError?.error_message) {
                toast.error(exitError.display_message || exitError.error_message);
            }
        },
    });

    useEffect(() => {
        if (!pendingOpen || !linkToken || !ready) {
            return;
        }

        setPendingOpen(false);
        open();
    }, [linkToken, open, pendingOpen, ready]);

    const handleClick = async () => {
        if (loadingToken || submitting) {
            return;
        }

        if (linkToken && ready) {
            open();
            return;
        }

        setPendingOpen(true);
        setLoadingToken(true);

        try {
            const result = await createPlaidLinkToken(isUpdateMode ? { itemId } : {});
            const nextLinkToken = result?.linkToken || "";
            if (!nextLinkToken) {
                throw new Error("Plaid did not return a link token.");
            }

            setLinkToken(nextLinkToken);
        } catch (e) {
            setPendingOpen(false);
            toast.error(e.message || "Failed to create Plaid link token.");
        } finally {
            setLoadingToken(false);
        }
    };

    const isLoading = loadingToken || submitting;
    const loadingText = submitting ? (isUpdateMode ? "Updating..." : "Connecting...") : "Preparing...";
    const buttonText = label || (isUpdateMode ? "Reconnect" : "Connect with bank");

    return (
        <div className={className}>
            <Button
                onClick={handleClick}
                loading={isLoading}
                loadingText={loadingText}
                disabled={isLoading}
                className={cn(
                    "group h-10 w-full min-w-[12.5rem] justify-center gap-2 rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(21,112,239,0.55)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--brand-strong)] hover:shadow-[0_12px_24px_-8px_rgba(21,112,239,0.6)] active:translate-y-0 active:shadow-[0_4px_12px_-6px_rgba(21,112,239,0.5)] sm:w-auto",
                    buttonClassName
                )}
            >
                <Bank className="size-4 transition-transform duration-200 group-hover:scale-110" />
                {buttonText}
            </Button>
        </div>
    );
}
