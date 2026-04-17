import React from "react";
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
            <Input
                name={name}
                type="email"
                autoComplete={autoComplete}
                value={value}
                placeholder={placeholder}
                onChange={onChange}
                className="rounded-[10px] border-[var(--card-border)] bg-white shadow-none"
            />
        </Field>
    );
}
