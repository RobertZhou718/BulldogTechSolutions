import { authScopes } from "@/auth/config/nativeAuthConfig.js";
import {
    buildSessionFromAccountData,
    getAuthErrorMessage,
    getNativeAuthClient,
} from "./nativeClient.js";

function throwUnsupportedStep(message) {
    throw new Error(message);
}

export async function signInWithPassword({ email, password }) {
    const authClient = await getNativeAuthClient();
    const signInResult = await authClient.signIn({
        username: email.trim(),
        scopes: authScopes,
    });

    if (signInResult.isFailed()) {
        throw new Error(
            getAuthErrorMessage(signInResult.error, "Unable to start the sign-in flow.")
        );
    }

    if (signInResult.isPasswordRequired()) {
        const submitResult = await signInResult.state.submitPassword(password);

        if (submitResult.isFailed()) {
            throw new Error(
                getAuthErrorMessage(
                    submitResult.error,
                    "Unable to complete the password sign-in flow."
                )
            );
        }

        if (typeof submitResult.isAuthMethodRegistrationRequired === "function" && submitResult.isAuthMethodRegistrationRequired()) {
            throwUnsupportedStep(
                "The tenant requires authentication method registration before sign-in can finish."
            );
        }

        if (typeof submitResult.isMfaRequired === "function" && submitResult.isMfaRequired()) {
            throwUnsupportedStep(
                "The tenant requires MFA after password sign-in. Complete MFA in the tenant configuration flow before using this screen."
            );
        }

        if (submitResult.isCompleted()) {
            return buildSessionFromAccountData(submitResult.data, "native");
        }
    }

    if (signInResult.isCompleted()) {
        return buildSessionFromAccountData(signInResult.data, "native");
    }

    if (signInResult.isCodeRequired()) {
        throwUnsupportedStep(
            "The tenant returned an email-code sign-in challenge. This screen expects email and password sign-in."
        );
    }

    if (typeof signInResult.isAuthMethodRegistrationRequired === "function" && signInResult.isAuthMethodRegistrationRequired()) {
        throwUnsupportedStep(
            "The tenant requires authentication method registration before sign-in can finish."
        );
    }

    if (typeof signInResult.isMfaRequired === "function" && signInResult.isMfaRequired()) {
        throwUnsupportedStep(
            "The tenant requires MFA after password sign-in. Complete MFA in the tenant configuration flow before using this screen."
        );
    }

    throw new Error("Unexpected sign-in state returned by the native auth SDK.");
}
