import React, { useState } from "react";
import { Eye, EyeOff, Lock01 } from "@untitledui/icons";
import { Field, Input } from "@/components/ui/Field.jsx";

export default function PasswordField({
    autoComplete = "current-password",
    error,
    hint,
    label = "Password",
    name = "password",
    onChange,
    placeholder = "••••••••••••",
    value,
}) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <Field label={label} error={error} hint={hint}>
            <div className="relative">
                <Lock01
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-gray-400)]"
                />
                <Input
                    name={name}
                    type={isVisible ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    className="h-11 pl-11 pr-11"
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[var(--color-gray-400)] transition hover:text-[var(--color-gray-600)]"
                    onClick={() => setIsVisible((current) => !current)}
                    aria-label={isVisible ? "Hide password" : "Show password"}
                >
                    {isVisible ? (
                        <EyeOff aria-hidden="true" className="h-5 w-5" />
                    ) : (
                        <Eye aria-hidden="true" className="h-5 w-5" />
                    )}
                </button>
            </div>
        </Field>
    );
}
