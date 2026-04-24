import React from "react";
import { cn } from "@/lib/utils";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";

export function Field({ label, hint, error, children, className }) {
    return (
        <label className={cn("flex flex-col gap-1.5", className)}>
            {label ? (
                <span className="text-sm font-medium text-[var(--color-gray-700)]">{label}</span>
            ) : null}
            {children}
            {error ? (
                <span className="text-sm text-[var(--color-error-700)]">{error}</span>
            ) : hint ? (
                <span className="text-sm text-[var(--color-gray-500)]">{hint}</span>
            ) : null}
        </label>
    );
}

export const Input = React.forwardRef(function Input(props, ref) {
    return <ShadcnInput ref={ref} {...props} />;
});

export const Textarea = React.forwardRef(function Textarea(props, ref) {
    return <ShadcnTextarea ref={ref} {...props} />;
});
