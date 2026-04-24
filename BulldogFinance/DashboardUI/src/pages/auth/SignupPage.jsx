import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/core/authContext.js";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import EmailField from "@/components/auth/EmailField.jsx";
import GoogleButton from "@/components/auth/GoogleButton.jsx";
import PasswordField from "@/components/auth/PasswordField.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/Field.jsx";

function formatAttributeLabel(name) {
    const labels = {
        city: "City",
        country: "Country",
        displayName: "Display name",
        givenName: "First name",
        jobTitle: "Job title",
        postalCode: "Postal code",
        state: "State",
        streetAddress: "Street address",
        surname: "Last name",
    };

    return (
        labels[name] ||
        name
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/[_-]+/g, " ")
            .replace(/^\w/, (char) => char.toUpperCase())
    );
}

export default function SignupPage() {
    const navigate = useNavigate();
    const { isLoading, signInWithGoogle, signUp } = useAuth();
    const [form, setForm] = useState({
        givenName: "",
        surname: "",
        email: "",
        password: "",
        confirmPassword: "",
        code: "",
    });
    const [error, setError] = useState("");
    const [pendingAction, setPendingAction] = useState(null);
    const [step, setStep] = useState("details");
    const [flowState, setFlowState] = useState(null);
    const [codeLength, setCodeLength] = useState(6);
    const [requiredAttributes, setRequiredAttributes] = useState([]);
    const [attributeValues, setAttributeValues] = useState({});

    const attributeDefaults = useMemo(() => ({
        givenName: form.givenName,
        surname: form.surname,
        displayName: [form.givenName, form.surname].filter(Boolean).join(" "),
    }), [form.givenName, form.surname]);

    const handleFieldChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleAttributeChange = (event) => {
        const { name, value } = event.target;
        setAttributeValues((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const applyStepResult = (result) => {
        if (result?.status === "authenticated") {
            navigate("/", { replace: true });
            return;
        }

        if (!result) {
            return;
        }

        setStep(result.step);
        setFlowState(result.flowState || null);
        setCodeLength(result.codeLength || 6);
        setRequiredAttributes(result.requiredAttributes || []);

        if (result.step === "collect_attributes") {
            setAttributeValues((current) => ({
                ...attributeDefaults,
                ...current,
            }));
        }
    };

    const runStep = async (action, fn, fallbackMessage) => {
        setError("");
        setPendingAction(action);

        try {
            const result = await fn();
            applyStepResult(result);
        } catch (authError) {
            setError(authError.message || fallbackMessage);
        } finally {
            setPendingAction(null);
        }
    };

    const handleSignupStart = async (event) => {
        event.preventDefault();

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        await runStep(
            "start",
            () => signUp({
                action: "start",
                email: form.email,
                password: form.password,
                givenName: form.givenName,
                surname: form.surname,
            }),
            "Unable to create the account."
        );
    };

    const handleCodeSubmit = async (event) => {
        event.preventDefault();
        await runStep(
            "verify_code",
            () => signUp({ action: "verify_code", code: form.code, flowState }),
            "The verification code was rejected."
        );
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        await runStep(
            "set_password",
            () => signUp({ action: "set_password", password: form.password, flowState }),
            "Unable to set the account password."
        );
    };

    const handleAttributeSubmit = async (event) => {
        event.preventDefault();
        await runStep(
            "submit_attributes",
            () => signUp({
                action: "submit_attributes",
                attributes: attributeValues,
                flowState,
            }),
            "Unable to save the account profile."
        );
    };

    const handleResendCode = async () => {
        await runStep(
            "resend_code",
            () => signUp({ action: "resend_code", flowState }),
            "Unable to resend the verification code."
        );
    };

    const handleGoogleSignUp = async () => {
        setError("");
        setPendingAction("google");

        try {
            await signInWithGoogle();
            navigate("/", { replace: true });
        } catch (authError) {
            setError(authError.message || "Unable to start Google sign-up.");
            setPendingAction(null);
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
                            Need a fresh code?
                        </span>
                        <button
                            type="button"
                            className="font-semibold text-[var(--brand)]"
                            onClick={handleResendCode}
                        >
                            Resend code
                        </button>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading && pendingAction === "verify_code"}
                        loadingText="Verifying..."
                        disabled={isLoading && pendingAction !== "verify_code"}
                    >
                        Verify email
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
                        hint="Use at least one strong, unique password for your client workspace."
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
                        className="w-full"
                        loading={isLoading && pendingAction === "set_password"}
                        loadingText="Saving..."
                        disabled={isLoading && pendingAction !== "set_password"}
                    >
                        Save password
                    </Button>
                </form>
            );
        }

        if (step === "collect_attributes") {
            return (
                <form className="space-y-5" onSubmit={handleAttributeSubmit}>
                    {requiredAttributes.map((attribute) => (
                        <Field
                            key={attribute.name}
                            label={formatAttributeLabel(attribute.name)}
                        >
                            <Input
                                name={attribute.name}
                                value={attributeValues[attribute.name] || ""}
                                onChange={handleAttributeChange}
                                placeholder={formatAttributeLabel(attribute.name)}
                                className="rounded-[10px] border-[var(--card-border)] bg-white shadow-none"
                            />
                        </Field>
                    ))}

                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading && pendingAction === "submit_attributes"}
                        loadingText="Saving..."
                        disabled={isLoading && pendingAction !== "submit_attributes"}
                    >
                        Complete profile
                    </Button>
                </form>
            );
        }

        return (
            <form className="space-y-5" onSubmit={handleSignupStart}>
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="First name">
                        <Input
                            name="givenName"
                            value={form.givenName}
                            onChange={handleFieldChange}
                            placeholder="First name"
                            className="rounded-[10px] border-[var(--card-border)] bg-white shadow-none"
                        />
                    </Field>
                    <Field label="Last name">
                        <Input
                            name="surname"
                            value={form.surname}
                            onChange={handleFieldChange}
                            placeholder="Last name"
                            className="rounded-[10px] border-[var(--card-border)] bg-white shadow-none"
                        />
                    </Field>
                </div>

                <EmailField
                    value={form.email}
                    onChange={handleFieldChange}
                />

                <PasswordField
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleFieldChange}
                    hint="Use at least 8 characters with a mix of letters, numbers, and symbols."
                />

                <PasswordField
                    autoComplete="new-password"
                    label="Confirm password"
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={handleFieldChange}
                />

                <div className="space-y-3">
                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading && pendingAction === "start"}
                        loadingText="Creating account..."
                        disabled={isLoading && pendingAction !== "start"}
                    >
                        Create account
                    </Button>

                    <GoogleButton
                        type="button"
                        onClick={handleGoogleSignUp}
                        loading={isLoading && pendingAction === "google"}
                        loadingText="Opening Google..."
                        disabled={isLoading && pendingAction !== "google"}
                    >
                        Sign up with Google
                    </GoogleButton>
                </div>
            </form>
        );
    };

    return (
        <AuthLayout
            title="Create an account"
            subtitle=""
        >
            <div className="flex flex-col gap-6">
                {error ? (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : null}

                {renderStep()}

                <div className="flex justify-center gap-1 text-center">
                    <span className="text-sm text-[var(--color-gray-500)]">
                        Already have an account?
                    </span>
                    <Link to="/login" className="text-sm font-semibold text-[var(--brand)]">
                        Log in instead
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
