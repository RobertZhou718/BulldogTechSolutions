import React, { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import Button from "@/components/ui/Button.jsx";
import { useApiClient } from "@/services/apiClient";

export default function ConnectBankButton({ onConnected, className }) {
    const { createPlaidLinkToken, exchangePlaidPublicToken } = useApiClient();
    const [linkToken, setLinkToken] = useState("");
    const [loadingToken, setLoadingToken] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoadingToken(true);
                setError("");
                const result = await createPlaidLinkToken();
                if (!cancelled) {
                    setLinkToken(result?.linkToken || "");
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e.message || "Failed to create Plaid link token.");
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
            setError("");

            try {
                await exchangePlaidPublicToken({
                    publicToken,
                    institutionId: metadata?.institution?.institution_id || null,
                    institutionName: metadata?.institution?.name || null,
                });
            } catch (e) {
                setError(e.message || "Failed to connect bank account.");
                setSubmitting(false);
                return;
            }

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
                setError(exitError.display_message || exitError.error_message);
            }
        },
    });

    const handleClick = () => {
        setError("");
        open();
    };

    return (
        <div className={className}>
            <Button onClick={handleClick} disabled={loadingToken || submitting || !linkToken || !ready}>
                {submitting ? "Connecting..." : "Connect with bank"}
            </Button>
            {error ? <p className="mt-3 text-sm font-medium text-[var(--color-error-500)]">{error}</p> : null}
        </div>
    );
}
