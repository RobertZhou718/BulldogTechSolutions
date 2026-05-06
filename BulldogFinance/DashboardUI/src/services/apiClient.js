import { useCallback, useMemo } from "react";
import { apiConfig } from "@/auth/config/nativeAuthConfig.js";
import { useAuth } from "@/auth/core/authContext.js";
import {
    getStoredAccessToken,
    getStoredAuthSession,
    saveStoredAuthSession,
} from "@/auth/core/tokenStore.js";
import {
    buildSessionFromAccountData,
    getCurrentAccountData,
} from "@/auth/native/nativeClient.js";
import { begin as beginRequest, end as endRequest } from "@/services/progressBus.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const REQUEST_TIMEOUT_MESSAGE = "Request timed out. Please try again.";

function isJwtExpiringSoon(token, skewMs = 0) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padding = "=".repeat((4 - (base64.length % 4)) % 4);
        const payload = JSON.parse(atob(base64 + padding));
        if (!payload.exp) return true;
        return Date.now() + skewMs >= payload.exp * 1000;
    } catch {
        return true;
    }
}

export function useApiClient() {
    const { signOut } = useAuth();

    const getAccessToken = useCallback(async () => {
        const storedToken = getStoredAccessToken();
        // Treat tokens within the skew window as "about to expire" so we refresh
        // proactively and never hand out a token the API will reject.
        const EXPIRY_SKEW_MS = 60 * 1000;

        if (storedToken && !isJwtExpiringSoon(storedToken, EXPIRY_SKEW_MS)) {
            return storedToken;
        }

        const storedSession = getStoredAuthSession();

        if (apiConfig.scopes.length > 0) {
            const accountData = await getCurrentAccountData().catch(() => null);

            if (accountData) {
                try {
                    const refreshedSession = await buildSessionFromAccountData(
                        accountData,
                        storedSession?.authMethod || "native"
                    );
                    saveStoredAuthSession(refreshedSession);
                    return refreshedSession.accessToken;
                } catch (refreshError) {
                    console.error("Silent token refresh failed", refreshError);
                    // Fall through to the stored token so a transient MSAL hiccup
                    // doesn't break the request — the API will 401 if it's truly bad.
                }
            }
        }

        if (!storedToken) {
            throw new Error("No signed-in access token");
        }

        return storedToken;
    }, []);

    // Centralized request helper that attaches the access token and normalizes API errors.
    const request = useCallback(async (path, options = {}) => {
        const {
            responseType = "json",
            allowNotFound = false,
            timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
            ...fetchOptions
        } = options;

        const controller = new AbortController();
        let didTimeout = false;
        let timeoutId = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = window.setTimeout(() => {
                didTimeout = true;
                controller.abort();
                reject(new Error(REQUEST_TIMEOUT_MESSAGE));
            }, timeoutMs);
        });

        const runRequest = async () => {
            const token = await getAccessToken();

            const headers = {
                "Content-Type": "application/json",
                ...(fetchOptions.headers || {}),
                Authorization: `Bearer ${token}`,
            };

            const response = await fetch(`${apiConfig.baseUrl}${path}`, {
                ...fetchOptions,
                headers,
                signal: fetchOptions.signal || controller.signal,
            });

            if (allowNotFound && response.status === 404) {
                return null;
            }

            if (response.status === 401) {
                signOut();
                throw new Error("Session expired. Please sign in again.");
            }

            if (!response.ok) {
                let errorMessage = "";
                const rawText = await response.text().catch(() => "");

                if (rawText) {
                    try {
                        const payload = JSON.parse(rawText);
                        const nestedError =
                            typeof payload?.error === "object" && payload.error !== null
                                ? payload.error.message || payload.error.code
                                : payload?.error;
                        errorMessage = payload?.message || nestedError || rawText;
                    } catch {
                        errorMessage = rawText;
                    }
                }

                console.error("API error", response.status, errorMessage);
                throw new Error(
                    errorMessage || `API ${response.status} ${response.statusText}`
                );
            }

            if (response.status === 204) {
                return null;
            }

            if (responseType === "text") {
                return response.text();
            }

            return response.json();
        };

        beginRequest();
        try {
            return await Promise.race([runRequest(), timeoutPromise]);
        } catch (error) {
            if (didTimeout || error?.name === "AbortError") {
                throw new Error(REQUEST_TIMEOUT_MESSAGE);
            }

            throw error;
        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            endRequest();
        }
    }, [getAccessToken, signOut]);

    // User and account APIs.
    const getMe = useCallback(() => {
        return request("/me", { method: "GET" });
    }, [request]);

    const postOnboarding = useCallback((payload) => {
        return request("/onboarding", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const getAccounts = useCallback((options = {}) => {
        return request("/accounts", { method: "GET", ...options });
    }, [request]);

    const createAccount = useCallback((payload) => {
        return request("/accounts", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const deleteAccount = useCallback((accountId) => {
        return request(`/accounts/${encodeURIComponent(accountId)}`, {
            method: "DELETE",
        });
    }, [request]);

    // Savings goal APIs.
    const getActiveSavingsGoal = useCallback((options = {}) => {
        return request("/savings-goals/active", {
            method: "GET",
            allowNotFound: true,
            ...options,
        });
    }, [request]);

    const createSavingsGoal = useCallback((payload) => {
        return request("/savings-goals", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const updateSavingsGoal = useCallback((goalId, payload) => {
        return request(`/savings-goals/${encodeURIComponent(goalId)}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const archiveSavingsGoal = useCallback((goalId) => {
        return request(`/savings-goals/${encodeURIComponent(goalId)}/archive`, {
            method: "POST",
        });
    }, [request]);

    // Transaction APIs.
    const getTransactions = useCallback((params = {}, options = {}) => {
        const search = new URLSearchParams();
        if (params.accountId) search.set("accountId", params.accountId);
        if (params.from) search.set("from", params.from);
        if (params.to) search.set("to", params.to);

        const qs = search.toString();
        const path = qs ? `/transactions?${qs}` : "/transactions";

        return request(path, { method: "GET", ...options });
    }, [request]);

    const createTransaction = useCallback((tx) => {
        return request("/transactions", {
            method: "POST",
            body: JSON.stringify(tx),
        });
    }, [request]);

    // Plaid APIs.
    const createPlaidLinkToken = useCallback((payload = {}) => {
        return request("/plaid/link-token", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const exchangePlaidPublicToken = useCallback((payload) => {
        return request("/plaid/exchange-public-token", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const syncPlaidTransactions = useCallback((payload = {}) => {
        return request("/plaid/sync-transactions", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const refreshPlaidBalances = useCallback((payload = {}) => {
        return request("/plaid/refresh-balances", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    // Investment APIs.
    const getInvestments = useCallback(() => {
        return request("/investments", { method: "GET" });
    }, [request]);

    const upsertInvestment = useCallback((investment) => {
        return request("/investments", {
            method: "POST",
            body: JSON.stringify(investment),
        });
    }, [request]);

    const deleteInvestment = useCallback((symbol) => {
        return request(`/investments/${encodeURIComponent(symbol)}`, {
            method: "DELETE",
        });
    }, [request]);

    // Watchlist APIs.
    const getWatchlist = useCallback(() => {
        return request("/investments/watchlist", { method: "GET" });
    }, [request]);

    const addToWatchlist = useCallback((item) => {
        return request("/investments/watchlist", {
            method: "POST",
            body: JSON.stringify(item),
        });
    }, [request]);

    const removeFromWatchlist = useCallback((symbol) => {
        return request(`/investments/watchlist/${encodeURIComponent(symbol)}`, {
            method: "DELETE",
        });
    }, [request]);

    // Investment overview APIs.
    const getInvestmentOverview = useCallback((options = {}) => {
        return request("/investments/overview", { method: "GET", ...options });
    }, [request]);

    const sendChatMessage = useCallback((payload) => {
        return request("/chat", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }, [request]);

    const getChatConversations = useCallback(() => {
        return request("/chat/conversations", { method: "GET" });
    }, [request]);

    const getChatConversation = useCallback((conversationId) => {
        return request(`/chat/conversations/${encodeURIComponent(conversationId)}`, {
            method: "GET",
        });
    }, [request]);

    const getLatestReport = useCallback((period) => {
        return request(`/reports/${encodeURIComponent(period)}/latest`, {
            method: "GET",
        });
    }, [request]);

    return useMemo(() => ({
        getMe,
        postOnboarding,
        getAccounts,
        createAccount,
        deleteAccount,
        getActiveSavingsGoal,
        createSavingsGoal,
        updateSavingsGoal,
        archiveSavingsGoal,
        getTransactions,
        createTransaction,
        createPlaidLinkToken,
        exchangePlaidPublicToken,
        syncPlaidTransactions,
        refreshPlaidBalances,
        getInvestments,
        upsertInvestment,
        deleteInvestment,
        getWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        getInvestmentOverview,
        sendChatMessage,
        getChatConversations,
        getChatConversation,
        getLatestReport,
    }), [
        addToWatchlist,
        createPlaidLinkToken,
        createAccount,
        createSavingsGoal,
        createTransaction,
        deleteAccount,
        deleteInvestment,
        exchangePlaidPublicToken,
        getAccounts,
        getActiveSavingsGoal,
        getChatConversation,
        getChatConversations,
        getInvestmentOverview,
        getInvestments,
        getLatestReport,
        getMe,
        getTransactions,
        getWatchlist,
        postOnboarding,
        archiveSavingsGoal,
        refreshPlaidBalances,
        removeFromWatchlist,
        sendChatMessage,
        syncPlaidTransactions,
        updateSavingsGoal,
        upsertInvestment,
    ]);
}
