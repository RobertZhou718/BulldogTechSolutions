import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/core/authContext.js";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import EmailField from "@/components/auth/EmailField.jsx";
import GoogleButton from "@/components/auth/GoogleButton.jsx";
import PasswordField from "@/components/auth/PasswordField.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function getRedirectTarget(location) {
    const from = location.state?.from;

    if (!from?.pathname) {
        return "/";
    }

    return `${from.pathname}${from.search || ""}${from.hash || ""}`;
}

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoading, signInWithGoogle, signInWithPassword } = useAuth();
    const redirectTarget = useMemo(() => getRedirectTarget(location), [location]);
    const [form, setForm] = useState({
        email: "",
        password: "",
        rememberMe: true,
    });
    const [error, setError] = useState("");
    const [pendingAction, setPendingAction] = useState(null);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleRememberMeChange = (event) => {
        setForm((current) => ({
            ...current,
            rememberMe: event.target.checked,
        }));
    };

    const handlePasswordSignIn = async (event) => {
        event.preventDefault();
        setError("");
        setPendingAction("password");

        try {
            await signInWithPassword(form.email, form.password, form.rememberMe);
            navigate(redirectTarget, { replace: true });
        } catch (authError) {
            setError(authError.message || "Unable to sign in.");
            setPendingAction(null);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setPendingAction("google");

        try {
            await signInWithGoogle();
            navigate(redirectTarget, { replace: true });
        } catch (authError) {
            setError(authError.message || "Unable to start Google sign-in.");
            setPendingAction(null);
        }
    };

    return (
        <AuthLayout
            title="Log in"
            subtitle="Welcome back! Please enter your details."
        >
            <form className="flex flex-col gap-6" onSubmit={handlePasswordSignIn}>
                <div className="flex flex-col gap-5">
                    <EmailField
                        value={form.email}
                        onChange={handleFieldChange}
                    />

                    <PasswordField
                        value={form.password}
                        onChange={handleFieldChange}
                    />
                </div>

                <div className="flex items-center">
                    <label className="inline-flex items-center gap-2 text-sm text-[var(--color-gray-600)]">
                        <input
                            type="checkbox"
                            checked={form.rememberMe}
                            onChange={handleRememberMeChange}
                            className="h-4 w-4 rounded border-[var(--color-gray-300)] text-[var(--brand)] focus:ring-[var(--focus-ring)]"
                        />
                        Remember for 30 days
                    </label>
                    <Link
                        to="/forgot-password"
                        className="ml-auto text-sm font-semibold text-[var(--brand)]"
                    >
                        Forgot password
                    </Link>
                </div>

                {error ? (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : null}

                <div className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading && pendingAction === "password"}
                        loadingText="Signing in..."
                        disabled={isLoading && pendingAction !== "password"}
                    >
                        Sign in
                    </Button>

                    <GoogleButton
                        type="button"
                        onClick={handleGoogleSignIn}
                        loading={isLoading && pendingAction === "google"}
                        loadingText="Opening Google..."
                        disabled={isLoading && pendingAction !== "google"}
                    >
                        Sign in with Google
                    </GoogleButton>
                </div>
            </form>

            <div className="flex justify-center gap-1 text-center">
                <span className="text-sm text-[var(--color-gray-500)]">
                    Don&apos;t have an account?
                </span>
                <Link
                    to="/signup"
                    className="text-sm font-semibold text-[var(--brand)]"
                >
                    Sign up
                </Link>
            </div>
        </AuthLayout>
    );
}
