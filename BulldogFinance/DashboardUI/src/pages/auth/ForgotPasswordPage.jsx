import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/core/authContext.js";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import EmailField from "@/components/auth/EmailField.jsx";
import PasswordField from "@/components/auth/PasswordField.jsx";
import Button from "@/components/ui/Button.jsx";
import { Field, Input } from "@/components/ui/Field.jsx";

export default function ForgotPasswordPage() {
    const { isLoading, resetPassword } = useAuth();
    const [form, setForm] = useState({
        email: "",
        code: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [flowState, setFlowState] = useState(null);
    const [step, setStep] = useState("start");
    const [codeLength, setCodeLength] = useState(6);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const applyResult = (result) => {
        if (!result) {
            return;
        }

        if (result.status === "completed") {
            setStep("completed");
            setFlowState(null);
            return;
        }

        setStep(result.step);
        setFlowState(result.flowState || null);
        setCodeLength(result.codeLength || 6);
    };

    const handleStart = async (event) => {
        event.preventDefault();
        setError("");

        try {
            const result = await resetPassword({
                action: "start",
                email: form.email,
            });

            applyResult(result);
        } catch (authError) {
            setError(authError.message || "Unable to start the password reset flow.");
        }
    };

    const handleCodeSubmit = async (event) => {
        event.preventDefault();
        setError("");

        try {
            const result = await resetPassword({
                action: "verify_code",
                code: form.code,
                flowState,
            });

            applyResult(result);
        } catch (authError) {
            setError(authError.message || "The verification code was rejected.");
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const result = await resetPassword({
                action: "set_password",
                password: form.password,
                flowState,
            });

            applyResult(result);
        } catch (authError) {
            setError(authError.message || "Unable to save the new password.");
        }
    };

    const handleResendCode = async () => {
        setError("");

        try {
            const result = await resetPassword({
                action: "resend_code",
                flowState,
            });

            applyResult(result);
        } catch (authError) {
            setError(authError.message || "Unable to resend the reset code.");
        }
    };

    const renderStep = () => {
        if (step === "verify_code") {
            return (
                <form className="space-y-5" onSubmit={handleCodeSubmit}>
                    <Field
                        label="Verification code"
                        hint={`Enter the ${codeLength}-digit code sent to ${form.email}.`}
                    >
                        <Input
                            name="code"
                            value={form.code}
                            onChange={handleFieldChange}
                            placeholder="Enter verification code"
                            className="rounded-[10px] border-[var(--card-border)] bg-white shadow-none"
                        />
                    </Field>

                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[var(--text-soft)]">
                            Need another code?
                        </span>
                        <button
                            type="button"
                            className="font-semibold text-[var(--accent)]"
                            onClick={handleResendCode}
                        >
                            Resend code
                        </button>
                    </div>

                    <Button
                        type="submit"
                        className="min-h-11 w-full rounded-[10px] shadow-none"
                        disabled={isLoading}
                    >
                        Verify code
                    </Button>
                </form>
            );
        }

        if (step === "set_password") {
            return (
                <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                    <PasswordField
                        autoComplete="new-password"
                        value={form.password}
                        onChange={handleFieldChange}
                        hint="Use a password you have not used with this account before."
                    />

                    <PasswordField
                        autoComplete="new-password"
                        label="Confirm password"
                        name="confirmPassword"
                        placeholder="Re-enter your password"
                        value={form.confirmPassword}
                        onChange={handleFieldChange}
                    />

                    <Button
                        type="submit"
                        className="min-h-11 w-full rounded-[10px] shadow-none"
                        disabled={isLoading}
                    >
                        Reset password
                    </Button>
                </form>
            );
        }

        if (step === "completed") {
            return (
                <div className="space-y-4 rounded-[16px] border border-[#d1fadf] bg-[#ecfdf3] p-5">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#027a48]">
                            Password updated
                        </p>
                        <p className="text-sm text-[#067647]">
                            Your Bulldog Finance password has been reset. Use it the next time you
                            sign in.
                        </p>
                    </div>

                    <Link
                        to="/login"
                        className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                    >
                        Return to log in
                    </Link>
                </div>
            );
        }

        return (
            <form className="space-y-5" onSubmit={handleStart}>
                <EmailField
                    value={form.email}
                    onChange={handleFieldChange}
                />

                <Button
                    type="submit"
                    className="min-h-11 w-full rounded-[10px] shadow-none"
                    disabled={isLoading}
                >
                    Send reset code
                </Button>
            </form>
        );
    };

    return (
        <AuthLayout
            title="Reset password"
            subtitle="Request a verification code, confirm it, then set a new Bulldog Finance password."
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between text-sm">
                    <Link to="/login" className="font-semibold text-[var(--accent)]">
                        Back to log in
                    </Link>
                    <Link to="/signup" className="text-[var(--text-soft)]">
                        Create account
                    </Link>
                </div>

                {error ? (
                    <div className="rounded-[12px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
                        {error}
                    </div>
                ) : null}

                {renderStep()}
            </div>
        </AuthLayout>
    );
}
