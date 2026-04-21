import { authScopes, googleProviderHint, nativeAuthConfig } from "@/auth/config/nativeAuthConfig.js";
import {
    buildSessionFromAccountData,
    getAuthErrorMessage,
    getNativeAuthClient,
} from "./nativeClient.js";

export async function signInWithGoogle() {
    const authClient = await getNativeAuthClient();

    try {
        await authClient.loginPopup({
            authority: nativeAuthConfig.auth.authority,
            scopes: authScopes,
            redirectUri: nativeAuthConfig.auth.redirectUri,
            domainHint: googleProviderHint,
        });
    } catch (error) {
        throw new Error(
            getAuthErrorMessage(error, "Google sign-in could not be started.")
        );
    }

    const accountResult = authClient.getCurrentAccount();

    if (accountResult.isFailed()) {
        throw new Error(
            getAuthErrorMessage(
                accountResult.error,
                "Google sign-in completed, but the account could not be restored."
            )
        );
    }

    if (!accountResult.isCompleted()) {
        throw new Error("Google sign-in did not return a completed account session.");
    }

    return buildSessionFromAccountData(accountResult.data, "social");
}
