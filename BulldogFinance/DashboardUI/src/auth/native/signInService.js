import { authScopes } from "@/auth/config/nativeAuthConfig.js";
import {
    buildSessionFromAccountData,
    getAuthErrorMessage,
    getNativeAuthClient,
} from "./nativeClient.js";
import {
    AuthProxyUnavailableError,
    signInWithPasswordViaProxy,
} from "./proxyAuthService.js";

export async function signInWithPassword({ email, password, rememberMe = false }) {
    try {
        const proxySession = await signInWithPasswordViaProxy({ email, password });

        if (proxySession.refreshToken || !rememberMe) {
            return proxySession;
        }
    } catch (error) {
        if (!(error instanceof AuthProxyUnavailableError)) {
            throw error;
        }
    }

    const username = email?.trim() || "";
    const authClient = await getNativeAuthClient();
    const result = await authClient.signIn({
        username,
        password,
        scopes: authScopes,
    });

    if (result.isFailed()) {
        throw new Error(
            getAuthErrorMessage(result.error, "Unable to complete the password sign-in flow.")
        );
    }

    if (typeof result.isCodeRequired === "function" && result.isCodeRequired()) {
        throw new Error(
            "This tenant requires an extra verification code to finish sign-in. Extend the login flow to handle sign-in challenges."
        );
    }

    if (typeof result.isPasswordRequired === "function" && result.isPasswordRequired()) {
        throw new Error("The password sign-in flow did not complete after the password step.");
    }

    if (
        typeof result.isAuthMethodRegistrationRequired === "function" &&
        result.isAuthMethodRegistrationRequired()
    ) {
        throw new Error(
            "The tenant requires authentication method registration before sign-in can finish."
        );
    }

    if (typeof result.isMfaRequired === "function" && result.isMfaRequired()) {
        throw new Error(
            "The tenant requires MFA before sign-in can finish. Handle the MFA challenge in the custom sign-in flow."
        );
    }

    if (!result.isCompleted()) {
        throw new Error("Unexpected sign-in state returned by the native auth SDK.");
    }

    return buildSessionFromAccountData(result.data, "native");
}
