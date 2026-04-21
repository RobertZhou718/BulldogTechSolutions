import { CustomAuthPublicClientApplication } from "@azure/msal-browser/custom-auth";
import {
    apiConfig,
    ensureNativeAuthConfig,
    nativeAuthConfig,
} from "@/auth/config/nativeAuthConfig.js";
import { getRememberMe } from "@/auth/core/tokenStore.js";

let nativeAuthClientPromise;

const FRIENDLY_ERRORS = {
    // Sign-up
    1003037: "An account with this email already exists. Please log in instead.",
    user_already_exists: "An account with this email already exists. Please log in instead.",
    701014: "A verification code was already sent to your email. Please check your inbox or wait a moment before requesting a new one.",

    // Sign-in
    50034: "No account found with this email address.",
    50126: "Incorrect email or password. Please try again.",
    50057: "This account has been disabled. Please contact support.",

    // OTP
    invalid_oob_value: "The verification code is incorrect. Please try again.",
    oob_code_expired: "The verification code has expired. Please request a new one.",

    // Password policy
    password_too_weak: "Your password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.",
    password_too_long: "Your password is too long.",
    password_recently_used: "You have used this password recently. Please choose a different one.",

    // Misc
    700016: "Application configuration error. Please contact support.",
};

export function getAuthErrorMessage(error, fallbackMessage) {
    const data = error?.errorData ?? error;

    const errorCodes = data?.errorCodes ?? [];
    for (const code of errorCodes) {
        if (FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code];
    }

    const errorCode = data?.error ?? data?.errorCode;
    if (errorCode && FRIENDLY_ERRORS[errorCode]) return FRIENDLY_ERRORS[errorCode];

    const subError = data?.subError ?? data?.suberror;
    if (subError && FRIENDLY_ERRORS[subError]) return FRIENDLY_ERRORS[subError];

    return fallbackMessage;
}

export async function getNativeAuthClient() {
    ensureNativeAuthConfig();

    if (!nativeAuthClientPromise) {
        const config = {
            ...nativeAuthConfig,
            cache: {
                ...nativeAuthConfig.cache,
                cacheLocation: getRememberMe() ? "localStorage" : "sessionStorage",
            },
        };
        nativeAuthClientPromise = CustomAuthPublicClientApplication.create(config)
            .catch((error) => {
                nativeAuthClientPromise = null;
                throw error;
            });
    }

    return nativeAuthClientPromise;
}

export async function getCurrentAccountData() {
    const authClient = await getNativeAuthClient();
    const accountResult = authClient.getCurrentAccount();

    if (accountResult.isCompleted()) {
        return accountResult.data;
    }

    return null;
}

function buildInitials(name = "", givenName = "", surname = "") {
    const source = [givenName, surname].filter(Boolean).join(" ") || name;

    return source
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 2);
}

export function mapAccountDataToUser(accountData) {
    const account = accountData.getAccount();
    const claims = accountData.getClaims() || {};
    const givenName = claims.given_name || claims.givenName || "";
    const surname = claims.family_name || claims.surname || "";
    const email = claims.email || account?.username || "";
    const name =
        account?.name ||
        claims.name ||
        [givenName, surname].filter(Boolean).join(" ") ||
        account?.username ||
        "User";

    return {
        id: account?.localAccountId || account?.homeAccountId || "",
        name,
        email,
        username: account?.username || email,
        givenName,
        surname,
        initials: buildInitials(name, givenName, surname) || "U",
    };
}

export async function buildSessionFromAccountData(accountData, authMethod) {
    if (!apiConfig.scopes.length) {
        throw new Error(
            "Missing API scope configuration. Set VITE_API_CLIENT_ID before signing in."
        );
    }

    const accessTokenResult = await accountData.getAccessToken({
        forceRefresh: false,
        scopes: apiConfig.scopes,
    });

    if (!accessTokenResult.isCompleted()) {
        throw new Error(
            getAuthErrorMessage(
                accessTokenResult.error,
                "Unable to acquire an API access token."
            )
        );
    }

    const accessToken = accessTokenResult.data?.accessToken;

    if (!accessToken) {
        throw new Error("The authentication flow completed without an API bearer token.");
    }

    return {
        accessToken,
        authMethod,
        user: mapAccountDataToUser(accountData),
    };
}
