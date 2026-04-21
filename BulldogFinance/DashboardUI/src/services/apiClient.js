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

export function useApiClient() {
    const { signOut } = useAuth();

    const getAccessToken = useCallback(async () => {
        const accountData = await getCurrentAccountData().catch(() => null);
        if (accountData && apiConfig.scopes.length > 0) {
            const refreshedSession = await buildSessionFromAccountData(
                accountData,
                getStoredAuthSession()?.authMethod || "native"
            );
            saveStoredAuthSession(refreshedSession);
            return refreshedSession.accessToken;
        }

        const accessToken = getStoredAccessToken();

        if (!accessToken) {
            throw new Error("No signed-in access token");
        }

        return accessToken;
    }, []);

    // Centralized request helper that attaches the access token and normalizes API errors.
    const request = useCallback(async (path, options = {}) => {
        const token = await getAccessToken();
        const { responseType = "json", allowNotFound = false, ...fetchOptions } = options;

        const headers = {
            "Content-Type": "application/json",
            ...(fetchOptions.headers || {}),
            Authorization: `Bearer ${token}`,
        };

        const response = await fetch(`${apiConfig.baseUrl}${path}`, {
            ...fetchOptions,
            headers,
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
                    errorMessage = payload?.message || payload?.error || rawText;
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

    const getAccounts = useCallback(() => {
        return request("/accounts", { method: "GET" });
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

    // Transaction APIs.
    const getTransactions = useCallback((params = {}) => {
        const search = new URLSearchParams();
        if (params.accountId) search.set("accountId", params.accountId);
        if (params.from) search.set("from", params.from);
        if (params.to) search.set("to", params.to);

        const qs = search.toString();
        const path = qs ? `/transactions?${qs}` : "/transactions";

        return request(path, { method: "GET" });
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
    const getInvestmentOverview = useCallback(() => {
        return request("/investments/overview", { method: "GET" });
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
        createTransaction,
        deleteAccount,
        deleteInvestment,
        exchangePlaidPublicToken,
        getAccounts,
        getChatConversation,
        getChatConversations,
        getInvestmentOverview,
        getInvestments,
        getLatestReport,
        getMe,
        getTransactions,
        getWatchlist,
        postOnboarding,
        refreshPlaidBalances,
        removeFromWatchlist,
        sendChatMessage,
        syncPlaidTransactions,
        upsertInvestment,
    ]);
}
