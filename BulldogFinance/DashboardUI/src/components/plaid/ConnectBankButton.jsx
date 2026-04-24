import React, { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useApiClient } from "@/services/apiClient";
import { toast } from "sonner";

export default function ConnectBankButton({ onConnected, className }) {
    const { createPlaidLinkToken, exchangePlaidPublicToken } = useApiClient();
    const [linkToken, setLinkToken] = useState("");
    const [loadingToken, setLoadingToken] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoadingToken(true);
                const result = await createPlaidLinkToken();
                if (!cancelled) {
                    setLinkToken(result?.linkToken || "");
                }
            } catch (e) {
                if (!cancelled) {
                    toast.error(e.message || "Failed to create Plaid link token.");
                }
            } finally {
                if (!cancelled) {
                    setLoadingToken(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [createPlaidLinkToken]);

    const { open, ready } = usePlaidLink({
        token: linkToken || null,
        onSuccess: async (publicToken, metadata) => {
            setSubmitting(true);
            const toastId = toast.loading("Linking your bank...");

            try {
                await exchangePlaidPublicToken({
                    publicToken,
                    institutionId: metadata?.institution?.institution_id || null,
                    institutionName: metadata?.institution?.name || null,
                });
            } catch (e) {
                toast.error(e.message || "Failed to connect bank account.", { id: toastId });
                setSubmitting(false);
                return;
            }

            toast.success(
                metadata?.institution?.name
                    ? `${metadata.institution.name} connected.`
                    : "Bank connected.",
                { id: toastId }
            );

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
            if (exitError?.display_message || exitError?.error_message) {
                toast.error(exitError.display_message || exitError.error_message);
            }
        },
    });

    const handleClick = () => {
        open();
    };

    const isLoading = loadingToken || submitting;
    const loadingText = submitting ? "Connecting..." : "Preparing...";

    return (
        <div className={className}>
            <Button
                onClick={handleClick}
                loading={isLoading}
                loadingText={loadingText}
                disabled={isLoading || !linkToken || !ready}
            >
                Connect with bank
            </Button>
        </div>
    );
}
