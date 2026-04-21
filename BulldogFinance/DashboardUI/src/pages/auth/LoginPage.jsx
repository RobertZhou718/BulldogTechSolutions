import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/core/authContext.js";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import EmailField from "@/components/auth/EmailField.jsx";
import GoogleButton from "@/components/auth/GoogleButton.jsx";
import PasswordField from "@/components/auth/PasswordField.jsx";
import Button from "@/components/ui/Button.jsx";

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

        try {
            await signInWithPassword(form.email, form.password, form.rememberMe);
            navigate(redirectTarget, { replace: true });
        } catch (authError) {
            setError(authError.message || "Unable to sign in.");
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");

        try {
            await signInWithGoogle();
            navigate(redirectTarget, { replace: true });
        } catch (authError) {
            setError(authError.message || "Unable to start Google sign-in.");
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
                            className="h-4 w-4 rounded border-[var(--color-gray-300)] text-[var(--accent)] focus:ring-[var(--focus-ring)]"
                        />
                        Remember for 30 days
                    </label>
                    <Link
                        to="/forgot-password"
                        className="ml-auto text-sm font-semibold text-[var(--accent)]"
                    >
                        Forgot password
                    </Link>
                </div>

                {error ? (
                    <div className="rounded-[12px] border border-[var(--color-error-100)] bg-[var(--color-error-50)] px-4 py-3 text-sm text-[var(--color-error-700)]">
                        {error}
                    </div>
                ) : null}

                <div className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="min-h-11 w-full rounded-[10px] shadow-[var(--shadow-sm)]"
                        disabled={isLoading}
                    >
                        Sign in
                    </Button>

                    <GoogleButton
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
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
                    className="text-sm font-semibold text-[var(--accent)]"
                >
                    Sign up
                </Link>
            </div>
        </AuthLayout>
    );
}
