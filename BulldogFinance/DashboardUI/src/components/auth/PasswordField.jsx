import React, { useState } from "react";
import { Field, Input } from "@/components/ui/Field.jsx";

export default function PasswordField({
    autoComplete = "current-password",
    error,
    hint,
    label = "Password",
    name = "password",
    onChange,
    placeholder = "Enter your password",
    value,
}) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <Field label={label} error={error} hint={hint}>
            <div className="relative">
                <Input
                    name={name}
                    type={isVisible ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    className="rounded-[10px] border-[var(--card-border)] bg-white pr-16 shadow-none"
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-3 text-sm font-medium text-[var(--text-soft)]"
                    onClick={() => setIsVisible((current) => !current)}
                >
                    {isVisible ? "Hide" : "Show"}
                </button>
            </div>
        </Field>
    );
}
