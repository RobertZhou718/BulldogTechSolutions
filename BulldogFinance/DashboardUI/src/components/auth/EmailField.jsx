import React from "react";
import { Mail01 } from "@untitledui/icons";
import { Field, Input } from "@/components/ui/Field.jsx";

export default function EmailField({
    autoComplete = "email",
    error,
    label = "Email",
    name = "email",
    onChange,
    placeholder = "Enter your email",
    value,
}) {
    return (
        <Field label={label} error={error}>
            <div className="relative">
                <Mail01
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-gray-400)]"
                />
                <Input
                    name={name}
                    type="email"
                    autoComplete={autoComplete}
                    value={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    className="h-11 pl-11"
                />
            </div>
        </Field>
    );
}
