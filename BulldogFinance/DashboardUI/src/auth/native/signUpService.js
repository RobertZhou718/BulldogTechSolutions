import { authScopes } from "@/auth/config/nativeAuthConfig.js";
import {
    buildSessionFromAccountData,
    getAuthErrorMessage,
    getNativeAuthClient,
} from "./nativeClient.js";

function pickAttributes(payload) {
    const displayName =
        payload.displayName ||
        [payload.givenName, payload.surname].filter(Boolean).join(" ");

    return Object.fromEntries(
        Object.entries({
            displayName: displayName || undefined,
            givenName: payload.givenName || undefined,
            surname: payload.surname || undefined,
        }).filter(([, value]) => Boolean(value))
    );
}

async function continueToSession(completedState) {
    const continuationResult = await completedState.signIn({
        scopes: authScopes,
    });

    if (continuationResult.isFailed()) {
        throw new Error(
            getAuthErrorMessage(
                continuationResult.error,
                "The account was created, but the follow-up sign-in failed."
            )
        );
    }

    if (typeof continuationResult.isAuthMethodRegistrationRequired === "function" && continuationResult.isAuthMethodRegistrationRequired()) {
        throw new Error(
            "The tenant requires authentication method registration before sign-in can finish."
        );
    }

    if (typeof continuationResult.isMfaRequired === "function" && continuationResult.isMfaRequired()) {
        throw new Error(
            "The tenant requires MFA after sign-up. Complete the remaining challenge in the tenant flow."
        );
    }

    if (continuationResult.isCompleted()) {
        return {
            status: "authenticated",
            session: await buildSessionFromAccountData(continuationResult.data, "native"),
        };
    }

    throw new Error("Unexpected sign-in continuation state returned after sign-up.");
}

async function normalizeSignUpResult(result, fallbackMessage) {
    if (result.isFailed()) {
        throw new Error(getAuthErrorMessage(result.error, fallbackMessage));
    }

    if (typeof result.isCodeRequired === "function" && result.isCodeRequired()) {
        return {
            status: "next_step",
            step: "verify_code",
            flowState: result.state,
            codeLength: result.state.getCodeLength?.() || 6,
        };
    }

    if (typeof result.isPasswordRequired === "function" && result.isPasswordRequired()) {
        return {
            status: "next_step",
            step: "set_password",
            flowState: result.state,
        };
    }

    if (typeof result.isAttributesRequired === "function" && result.isAttributesRequired()) {
        return {
            status: "next_step",
            step: "collect_attributes",
            flowState: result.state,
            requiredAttributes: result.state.getRequiredAttributes?.() || [],
        };
    }

    if (typeof result.isCompleted === "function" && result.isCompleted()) {
        return continueToSession(result.state);
    }

    throw new Error("Unexpected sign-up state returned by the native auth SDK.");
}

export async function startSignUp(payload) {
    const authClient = await getNativeAuthClient();
    const attributes = pickAttributes(payload);
    const signUpResult = await authClient.signUp({
        username: payload.email.trim(),
        password: payload.password || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    });

    return normalizeSignUpResult(signUpResult, "Unable to start the sign-up flow.");
}

export async function submitSignUpCode(flowState, code) {
    const result = await flowState.submitCode(code);
    return normalizeSignUpResult(result, "The verification code was rejected.");
}

export async function submitSignUpPassword(flowState, password) {
    const result = await flowState.submitPassword(password);
    return normalizeSignUpResult(result, "Unable to save the account password.");
}

export async function submitSignUpAttributes(flowState, attributes) {
    const result = await flowState.submitAttributes(attributes);
    return normalizeSignUpResult(result, "Unable to submit the required account attributes.");
}

export async function resendSignUpCode(flowState) {
    const result = await flowState.resendCode();

    if (result.isFailed()) {
        throw new Error(
            getAuthErrorMessage(result.error, "Unable to resend the verification code.")
        );
    }

    return {
        status: "next_step",
        step: "verify_code",
        flowState: result.state || flowState,
        codeLength: result.state?.getCodeLength?.() || flowState.getCodeLength?.() || 6,
    };
}
