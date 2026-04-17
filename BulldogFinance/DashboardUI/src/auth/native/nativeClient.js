import { CustomAuthPublicClientApplication } from "@azure/msal-browser/custom-auth";
import {
    apiConfig,
    ensureNativeAuthConfig,
    nativeAuthConfig,
} from "@/auth/config/nativeAuthConfig.js";

let nativeAuthClientPromise;

export function getAuthErrorMessage(error, fallbackMessage) {
    return (
        error?.errorData?.errorDescription ||
        error?.errorDescription ||
        error?.message ||
        fallbackMessage
    );
}

export async function getNativeAuthClient() {
    ensureNativeAuthConfig();

    if (!nativeAuthClientPromise) {
        nativeAuthClientPromise = CustomAuthPublicClientApplication.create(nativeAuthConfig);
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
