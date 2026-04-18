import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/core/authContext.js";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import AuthTabs from "@/components/auth/AuthTabs.jsx";
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
    });
    const [error, setError] = useState("");

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handlePasswordSignIn = async (event) => {
        event.preventDefault();
        setError("");

        try {
            await signInWithPassword(form.email, form.password);
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
            title="Welcome back"
            subtitle="Sign in to Bulldog Finance with your email and password, or continue with Google."
        >
            <div className="space-y-6">
                <AuthTabs active="login" />

                <form className="space-y-6" onSubmit={handlePasswordSignIn}>
                    <div className="space-y-4">
                        <EmailField
                            value={form.email}
                            onChange={handleFieldChange}
                        />

                        <div className="space-y-2">
                            <PasswordField
                                value={form.password}
                                onChange={handleFieldChange}
                            />
                            <div className="flex items-center justify-between gap-4">
                                <label className="inline-flex items-center gap-2 text-sm text-[var(--color-gray-600)]">
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        className="h-4 w-4 rounded border-[var(--color-gray-300)] text-[var(--accent)] focus:ring-[var(--focus-ring)]"
                                    />
                                    Keep me signed in
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-sm font-semibold text-[var(--accent)]"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-[12px] border border-[var(--color-error-100)] bg-[var(--color-error-50)] px-4 py-3 text-sm text-[var(--color-error-700)]">
                            {error}
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <Button
                            type="submit"
                            className="min-h-11 w-full rounded-[10px] shadow-[var(--shadow-sm)]"
                            disabled={isLoading}
                        >
                            Sign in
                        </Button>

                        <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-[var(--color-gray-200)]" />
                            </div>
                            <span className="relative mx-auto flex w-fit bg-white px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-gray-500)]">
                                Or
                            </span>
                        </div>

                        <GoogleButton
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            Continue with Google
                        </GoogleButton>
                    </div>
                </form>

                <div className="rounded-[12px] border border-[var(--color-brand-200)] bg-[var(--color-brand-25)] px-4 py-3">
                    <p className="text-xs leading-5 text-[var(--color-brand-800)]">
                        Protected by Microsoft Entra External ID. Google sign-in uses the
                        secure External ID social provider flow.
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
