import { getAuthErrorMessage, getNativeAuthClient } from "./nativeClient.js";

function normalizeResetResult(result, fallbackMessage) {
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

    if (typeof result.isCompleted === "function" && result.isCompleted()) {
        return {
            status: "completed",
        };
    }

    throw new Error("Unexpected reset-password state returned by the native auth SDK.");
}

export async function startResetPassword({ email }) {
    const authClient = await getNativeAuthClient();
    const result = await authClient.resetPassword({
        username: email.trim(),
    });

    return normalizeResetResult(result, "Unable to start the password reset flow.");
}

export async function submitResetPasswordCode(flowState, code) {
    const result = await flowState.submitCode(code);
    return normalizeResetResult(result, "The verification code was rejected.");
}

export async function submitResetPasswordPassword(flowState, password) {
    const result = await flowState.submitNewPassword(password);
    return normalizeResetResult(result, "Unable to save the new password.");
}

export async function resendResetPasswordCode(flowState) {
    const result = await flowState.resendCode();

    if (result.isFailed()) {
        throw new Error(
            getAuthErrorMessage(result.error, "Unable to resend the reset code.")
        );
    }

    return {
        status: "next_step",
        step: "verify_code",
        flowState: result.state || flowState,
        codeLength: result.state?.getCodeLength?.() || flowState.getCodeLength?.() || 6,
    };
}
