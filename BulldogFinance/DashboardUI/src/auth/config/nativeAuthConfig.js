const env = import.meta.env;

const tenantSubdomain = env.VITE_AUTH_TENANT_NAME?.trim() || "";
const tenantId = env.VITE_AUTH_TENANT_ID?.trim() || "";
const clientId = env.VITE_SPA_CLIENT_ID?.trim() || "";
const redirectUri = env.VITE_REDIRECT_URI?.trim() || "";
const apiBaseUrl = env.VITE_API_BASE_URL?.trim() || "";
const apiClientId = env.VITE_API_CLIENT_ID?.trim() || "";
const authApiProxyUrl = env.VITE_AUTH_API_PROXY_URL?.trim() || "";

const authorityHost = tenantSubdomain ? `${tenantSubdomain}.ciamlogin.com` : "";
const authority = authorityHost && tenantId ? `https://${authorityHost}/${tenantId}` : "";
const apiScope = apiClientId ? `api://${apiClientId}/api.access` : "";

function getBrowserOrigin() {
    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }

    return "http://localhost";
}

function normalizeUrl(url) {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveNativeAuthProxyUrl({ explicitProxyUrl, apiUrl }) {
    if (explicitProxyUrl) {
        return normalizeUrl(new URL(explicitProxyUrl, getBrowserOrigin()).toString());
    }

    const backendOrigin = apiUrl
        ? new URL(apiUrl, getBrowserOrigin()).origin
        : getBrowserOrigin();

    return new URL("/api/native-auth", backendOrigin).toString();
}

export const requiredNativeAuthEnv = [
    "VITE_AUTH_TENANT_NAME",
    "VITE_AUTH_TENANT_ID",
    "VITE_SPA_CLIENT_ID",
    "VITE_REDIRECT_URI",
    "VITE_API_BASE_URL",
    "VITE_API_CLIENT_ID",
];

export const missingNativeAuthEnv = requiredNativeAuthEnv.filter((key) => !env[key]?.trim());

export function ensureNativeAuthConfig() {
    if (missingNativeAuthEnv.length) {
        throw new Error(
            `Missing required auth env vars: ${missingNativeAuthEnv.join(", ")}`
        );
    }
}

export const nativeAuthConfig = {
    customAuth: {
        challengeTypes: ["password", "oob", "redirect"],
        authApiProxyUrl: resolveNativeAuthProxyUrl({
            explicitProxyUrl: authApiProxyUrl,
            apiUrl: apiBaseUrl,
        }),
    },
    auth: {
        clientId,
        authority,
        knownAuthorities: authorityHost ? [authorityHost] : [],
        redirectUri,
        postLogoutRedirectUri: redirectUri,
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

export const apiConfig = {
    baseUrl: apiBaseUrl,
    scope: apiScope,
    scopes: apiScope ? [apiScope] : [],
};

export const authScopes = ["openid", "profile", "offline_access", "email", apiScope].filter(Boolean);
export const googleProviderHint = "Google";
