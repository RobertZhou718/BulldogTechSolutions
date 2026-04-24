import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext.js";
import {
    bootstrapStoredAuthSession,
    clearStoredAuthSession,
    getRememberMe,
    hasRefreshableStoredSession,
    saveStoredAuthSession,
    setRememberMe,
} from "./tokenStore.js";
import {
    buildSessionFromAccountData,
    getCurrentAccountData,
} from "@/auth/native/nativeClient.js";
import { refreshStoredSessionViaProxy } from "@/auth/native/proxyAuthService.js";
import { signInWithPassword as signInWithPasswordService } from "@/auth/native/signInService.js";
import {
    resendResetPasswordCode,
    startResetPassword,
    submitResetPasswordCode,
    submitResetPasswordPassword,
} from "@/auth/native/resetPasswordService.js";
import {
    resendSignUpCode,
    startSignUp,
    submitSignUpAttributes,
    submitSignUpCode,
    submitSignUpPassword,
} from "@/auth/native/signUpService.js";
import { signInWithGoogle as signInWithGoogleService } from "@/auth/native/socialService.js";

const rawBootstrappedSession = bootstrapStoredAuthSession();

function isAccessTokenExpired(token) {
    try {
        const base64Url = token.split(".")[1];
        // JWT uses base64url encoding; atob requires standard base64
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padding = "=".repeat((4 - (base64.length % 4)) % 4);
        const payload = JSON.parse(atob(base64 + padding));
        return !payload.exp || Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

// Drop the bootstrapped session early if its JWT is already expired — otherwise
// the UI flashes protected content before initialize() catches up.
const bootstrappedSession =
    rawBootstrappedSession?.accessToken &&
    (!isAccessTokenExpired(rawBootstrappedSession.accessToken) ||
        hasRefreshableStoredSession(rawBootstrappedSession))
        ? rawBootstrappedSession
        : null;

async function wipeMsalAccount() {
    try {
        const accountData = await getCurrentAccountData();
        if (accountData) {
            await accountData.signOut();
        }
    } catch (error) {
        console.error("Failed to clear MSAL account", error);
    }
}

export default function AuthProvider({ children }) {
    const [authState, setAuthState] = useState({
        isAuthenticated: Boolean(bootstrappedSession?.accessToken),
        isLoading: true,
        user: bootstrappedSession?.user || null,
        accessToken: bootstrappedSession?.accessToken || null,
        authMethod: bootstrappedSession?.authMethod || null,
    });

    const clearSession = useCallback(() => {
        clearStoredAuthSession();
        setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
            authMethod: null,
        });
    }, []);

    const applySession = useCallback((session) => {
        const storedSession = saveStoredAuthSession(session);

        if (!storedSession) {
            clearSession();
            throw new Error("Unable to persist the authenticated session.");
        }

        setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: storedSession.user,
            accessToken: storedSession.accessToken,
            authMethod: storedSession.authMethod,
        });

        return storedSession;
    }, [clearSession]);

    const setBusy = useCallback((isLoading) => {
        setAuthState((current) => ({
            ...current,
            isLoading,
        }));
    }, []);

    useEffect(() => {
        let isActive = true;

        const initialize = async () => {
            try {
                const accountData = await getCurrentAccountData();

                if (!isActive) {
                    return;
                }

                if (!accountData) {
                    if (hasRefreshableStoredSession(bootstrappedSession)) {
                        try {
                            const refreshedSession = await refreshStoredSessionViaProxy();
                            if (isActive && refreshedSession) {
                                applySession(refreshedSession);
                            } else if (isActive) {
                                clearSession();
                            }
                        } catch (refreshError) {
                            console.error("Stored session refresh failed", refreshError);
                            if (isActive) {
                                clearSession();
                            }
                        }
                    } else if (
                        bootstrappedSession?.accessToken &&
                        !isAccessTokenExpired(bootstrappedSession.accessToken)
                    ) {
                        if (isActive) {
                            setAuthState((current) => ({ ...current, isLoading: false }));
                        }
                    } else {
                        clearSession();
                    }
                    return;
                }

                try {
                    const restoredSession = await buildSessionFromAccountData(
                        accountData,
                        bootstrappedSession?.authMethod || "native"
                    );

                    if (isActive) {
                        applySession(restoredSession);
                    }
                } catch (error) {
                    console.error("Failed to restore auth session", error);

                    if (!isActive) {
                        return;
                    }

                    // Silent token refresh can fail transiently (e.g. MSAL cache
                    // missing a refresh token after a storage change). If our
                    // stored JWT is still valid, keep the user signed in — the
                    // API will 401 if it's truly invalid.
                    if (bootstrappedSession?.accessToken) {
                        setAuthState((current) => ({ ...current, isLoading: false }));
                    } else {
                        // MSAL has a stale account but we can't refresh it — wipe
                        // its cache too so a follow-up signup/signIn isn't blocked.
                        try {
                            await accountData.signOut();
                        } catch (signOutError) {
                            console.error("Failed to clear stale MSAL account", signOutError);
                        }
                        if (isActive) {
                            clearSession();
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to initialize auth provider", error);

                if (isActive) {
                    clearSession();
                }
            }
        };

        void initialize();

        return () => {
            isActive = false;
        };
    }, [applySession, clearSession]);

    const signInWithPassword = useCallback(async (email, password, rememberMe = false) => {
        const previousRememberMe = getRememberMe();
        setRememberMe(rememberMe);
        setBusy(true);

        try {
            const session = await signInWithPasswordService({ email, password, rememberMe });
            return applySession(session);
        } catch (error) {
            // Revert rememberMe so a failed attempt doesn't mutate the user's preference.
            setRememberMe(previousRememberMe);
            setBusy(false);
            throw error;
        }
    }, [applySession, setBusy]);

    const signInWithGoogle = useCallback(async () => {
        const previousRememberMe = getRememberMe();
        setRememberMe(true);
        setBusy(true);

        try {
            const session = await signInWithGoogleService();
            return applySession(session);
        } catch (error) {
            setRememberMe(previousRememberMe);
            setBusy(false);
            throw error;
        }
    }, [applySession, setBusy]);

    const signUp = useCallback(async (payload) => {
        setBusy(true);

        try {
            let result;

            switch (payload?.action || "start") {
                case "start":
                    result = await startSignUp(payload);
                    break;
                case "verify_code":
                    result = await submitSignUpCode(payload.flowState, payload.code);
                    break;
                case "set_password":
                    result = await submitSignUpPassword(payload.flowState, payload.password);
                    break;
                case "submit_attributes":
                    result = await submitSignUpAttributes(payload.flowState, payload.attributes);
                    break;
                case "resend_code":
                    result = await resendSignUpCode(payload.flowState);
                    break;
                default:
                    throw new Error(`Unsupported sign-up action: ${payload?.action}`);
            }

            if (result?.status === "authenticated") {
                return {
                    ...result,
                    session: applySession(result.session),
                };
            }

            setBusy(false);
            return result;
        } catch (error) {
            setBusy(false);
            throw error;
        }
    }, [applySession, setBusy]);

    const resetPassword = useCallback(async (payload) => {
        setBusy(true);

        try {
            let result;

            switch (payload?.action || "start") {
                case "start":
                    result = await startResetPassword(payload);
                    break;
                case "verify_code":
                    result = await submitResetPasswordCode(payload.flowState, payload.code);
                    break;
                case "set_password":
                    result = await submitResetPasswordPassword(payload.flowState, payload.password);
                    break;
                case "resend_code":
                    result = await resendResetPasswordCode(payload.flowState);
                    break;
                default:
                    throw new Error(`Unsupported reset-password action: ${payload?.action}`);
            }

            setBusy(false);
            return result;
        } catch (error) {
            setBusy(false);
            throw error;
        }
    }, [setBusy]);

    const signOut = useCallback(async () => {
        clearStoredAuthSession();
        setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
            authMethod: null,
        });

        await wipeMsalAccount();
    }, []);

    const contextValue = useMemo(() => ({
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        user: authState.user,
        accessToken: authState.accessToken,
        authMethod: authState.authMethod,
        signInWithPassword,
        signUp,
        signInWithGoogle,
        resetPassword,
        signOut,
    }), [
        authState.accessToken,
        authState.authMethod,
        authState.isAuthenticated,
        authState.isLoading,
        authState.user,
        resetPassword,
        signInWithGoogle,
        signInWithPassword,
        signOut,
        signUp,
    ]);

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
