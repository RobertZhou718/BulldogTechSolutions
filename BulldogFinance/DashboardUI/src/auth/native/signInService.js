import { apiConfig } from "@/auth/config/nativeAuthConfig.js";

function normalizeBaseUrl(url) {
    return (url || "").replace(/\/+$/, "");
}

function extractErrorMessage(payload, fallbackMessage) {
    return (
        payload?.error?.message ||
        payload?.error?.errorDescription ||
        payload?.message ||
        fallbackMessage
    );
}

function toSessionUser(user, email) {
    const normalizedEmail = user?.email || email;
    const name = user?.displayName || normalizedEmail || "User";

    return {
        id: user?.id || "",
        name,
        email: normalizedEmail,
        username: normalizedEmail,
        givenName: user?.givenName || "",
        surname: user?.surname || "",
    };
}

export async function signInWithPassword({ email, password }) {
    const trimmedEmail = email?.trim() || "";
    const baseUrl = normalizeBaseUrl(apiConfig.baseUrl);

    if (!baseUrl) {
        throw new Error("Missing API base URL configuration.");
    }

    const response = await fetch(`${baseUrl}/auth/native/signin`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: trimmedEmail,
            password,
        }),
    });

    const raw = await response.text().catch(() => "");
    let payload = null;

    if (raw) {
        try {
            payload = JSON.parse(raw);
        } catch {
            payload = null;
        }
    }

    if (!response.ok || !payload?.success) {
        throw new Error(
            extractErrorMessage(payload, "Unable to complete the password sign-in flow.")
        );
    }

    if (!payload?.accessToken) {
        throw new Error(
            payload?.nextStep
                ? `Sign-in requires an additional step: ${payload.nextStep}.`
                : "The sign-in flow completed without an access token."
        );
    }

    return {
        accessToken: payload.accessToken,
        authMethod: "native_function",
        user: toSessionUser(payload.user, trimmedEmail),
    };
}
