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
            title="Log in"
            subtitle="Sign in with your Bulldog Finance email and password or continue with Google."
        >
            <div className="space-y-6">
                <AuthTabs active="login" />

                <form className="space-y-5" onSubmit={handlePasswordSignIn}>
                    <EmailField
                        value={form.email}
                        onChange={handleFieldChange}
                    />

                    <div className="space-y-2">
                        <PasswordField
                            value={form.password}
                            onChange={handleFieldChange}
                        />
                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-sm font-semibold text-[var(--accent)]"
                            >
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-[12px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
                            {error}
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <Button
                            type="submit"
                            className="min-h-11 w-full rounded-[10px] shadow-none"
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

                <p className="text-xs leading-5 text-[var(--text-soft)]">
                    Native auth is powered by Microsoft Entra External ID. Google uses the
                    External ID social provider popup flow.
                </p>
            </div>
        </AuthLayout>
    );
}
