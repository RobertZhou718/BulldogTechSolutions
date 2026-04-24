import { apiConfig } from "@/auth/config/nativeAuthConfig.js";
import {
    getStoredAuthSession,
    getStoredRefreshToken,
    saveStoredAuthSession,
} from "@/auth/core/tokenStore.js";

class AuthProxyUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = "AuthProxyUnavailableError";
    }
}

function buildUrl(path) {
    if (!apiConfig.baseUrl) {
        throw new AuthProxyUnavailableError("The auth proxy base URL is not configured.");
    }

    return `${apiConfig.baseUrl}${path}`;
}

function getProxyError(payload, fallback) {
    return payload?.error?.message || payload?.message || fallback;
}

function mapProxyUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id || "",
        name: user.displayName || user.name || user.email || "User",
        email: user.email || user.username || "",
        username: user.username || user.email || "",
        givenName: user.givenName || user.given_name || "",
        surname: user.surname || user.family_name || "",
    };
}

async function postAuthProxy(path, body) {
    let response;

    try {
        response = await fetch(buildUrl(path), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
    } catch (error) {
        if (error instanceof AuthProxyUnavailableError) {
            throw error;
        }

        throw new AuthProxyUnavailableError("The auth proxy could not be reached.");
    }

    const payload = await response.json().catch(() => null);

    if (response.status === 503 && payload?.error?.code === "auth_proxy_not_configured") {
        throw new AuthProxyUnavailableError(getProxyError(payload, "The auth proxy is not configured."));
    }

    if (!response.ok || payload?.success === false) {
        throw new Error(getProxyError(payload, "Unable to complete the authentication request."));
    }

    return payload || {};
}

function buildSession(payload, authMethod, existingSession = null) {
    const accessToken = payload.accessToken;
    const refreshToken = payload.refreshToken || existingSession?.refreshToken || null;
    const user = mapProxyUser(payload.user) || existingSession?.user;

    if (!accessToken || !user) {
        throw new Error("The authentication service returned an incomplete session.");
    }

    return {
        accessToken,
        refreshToken,
        expiresAt: payload.expiresIn ? Date.now() + payload.expiresIn * 1000 : null,
        rememberUntil: existingSession?.rememberUntil || null,
        authMethod,
        user,
    };
}

export async function signInWithPasswordViaProxy({ email, password }) {
    const username = email?.trim() || "";
    const payload = await postAuthProxy("/auth/native/signin", {
        email: username,
        username,
        password,
    });

    if (!payload.accessToken && payload.challenge) {
        throw new Error(payload.challenge.message || "Additional verification is required to complete sign-in.");
    }

    return buildSession(payload, "native-proxy");
}

export async function refreshStoredSessionViaProxy() {
    const refreshToken = getStoredRefreshToken();
    const existingSession = getStoredAuthSession();

    if (!refreshToken || !existingSession) {
        return null;
    }

    const payload = await postAuthProxy("/auth/native/token/refresh", {
        refreshToken,
    });
    const refreshedSession = buildSession(payload, existingSession.authMethod || "native-proxy", existingSession);

    return saveStoredAuthSession(refreshedSession);
}

export { AuthProxyUnavailableError };
