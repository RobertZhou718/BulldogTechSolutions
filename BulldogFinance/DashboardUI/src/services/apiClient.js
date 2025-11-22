import { useMsal } from "@azure/msal-react";
import { apiConfig } from "./authConfig";

export function useApiClient() {
    const { instance, accounts } = useMsal();
    const account = accounts[0];

    // 拿 Access Token
    async function getAccessToken() {
        if (!account) {
            throw new Error("No signed-in account");
        }

        const result = await instance.acquireTokenSilent({
            account,
            scopes: apiConfig.scopes,
        });

        return result.accessToken;
    }

    // 通用请求封装
    async function request(path, options = {}) {
        const token = await getAccessToken();

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        };

        const response = await fetch(`${apiConfig.baseUrl}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            console.error("API error", response.status, text);
            throw new Error(
                `API ${response.status} ${response.statusText} - ${text}`
            );
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    // ===== 具体 API 封装 =====

    // GET /api/me  —— 检查用户是否已经 Onboarding
    function getMe() {
        return request("/me", { method: "GET" });
    }

    // POST /api/onboarding  —— 初次 Onboarding，提交初始账户信息
    // payload: { defaultCurrency, accounts: [ { name, type, currency, initialBalance } ] }
    function postOnboarding(payload) {
        return request("/onboarding", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    // GET /api/accounts  —— 账户列表
    function getAccounts() {
        return request("/accounts", { method: "GET" });
    }

    // GET /api/transactions?accountId=...&from=...&to=...
    function getTransactions(params = {}) {
        const search = new URLSearchParams();
        if (params.accountId) search.set("accountId", params.accountId);
        if (params.from) search.set("from", params.from);
        if (params.to) search.set("to", params.to);

        const qs = search.toString();
        const path = qs ? `/transactions?${qs}` : "/transactions";

        return request(path, { method: "GET" });
    }

    // POST /api/transactions  —— 新增一条收支
    // tx: { accountId, type: 'INCOME'|'EXPENSE', amount, currency?, category?, note?, occurredAtUtc? }
    function createTransaction(tx) {
        return request("/transactions", {
            method: "POST",
            body: JSON.stringify(tx),
        });
    }

        // ======================
    // Investments 持仓相关
    // ======================

    function getInvestments() {
        return request("/investments", { method: "GET" });
    }

    function upsertInvestment(investment) {
        // investment: { symbol, exchange, quantity, avgCost, currency }
        return request("/investments", {
            method: "POST",
            body: JSON.stringify(investment),
        });
    }

    function deleteInvestment(symbol) {
        return request(`/investments/${encodeURIComponent(symbol)}`, {
            method: "DELETE",
        });
    }

    // ======================
    // Watchlist 自选股
    // ======================

    function getWatchlist() {
        return request("/investments/watchlist", { method: "GET" });
    }

    function addToWatchlist(item) {
        // item: { symbol, exchange }
        return request("/investments/watchlist", {
            method: "POST",
            body: JSON.stringify(item),
        });
    }

    function removeFromWatchlist(symbol) {
        return request(`/investments/watchlist/${encodeURIComponent(symbol)}`, {
            method: "DELETE",
        });
    }

    // ======================
    // Overview (价格 + 新闻)
    // ======================

    function getInvestmentOverview() {
        return request("/investments/overview", { method: "GET" });
    }

    return {
        getMe,
        postOnboarding,
        getAccounts,
        getTransactions,
        createTransaction,
        getInvestments,
        upsertInvestment,
        deleteInvestment,
        getWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        getInvestmentOverview
    };
}
