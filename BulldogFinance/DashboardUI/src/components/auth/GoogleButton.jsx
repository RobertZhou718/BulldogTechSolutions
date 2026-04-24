import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.js";

export default function GoogleButton({
    children = "Continue with Google",
    className,
    ...props
}) {
    return (
        <Button
            variant="secondary"
            className={cn(
                "min-h-11 w-full rounded-[10px] border-[var(--card-border)] bg-white text-[var(--text-muted)] shadow-none hover:bg-[var(--bg-subtle)]",
                className
            )}
            {...props}
        >
            <GoogleIcon />
            {children}
        </Button>
    );
}

function GoogleIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path
                fill="#4285F4"
                d="M21.6 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.39a4.61 4.61 0 0 1-2 3.03v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.28Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.23-2.51c-.9.6-2.05.96-3.4.96-2.62 0-4.84-1.77-5.63-4.15H3.03v2.59A9.99 9.99 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC04"
                d="M6.37 13.86A5.98 5.98 0 0 1 6.06 12c0-.65.11-1.28.31-1.86V7.55H3.03A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.03 4.45l3.34-2.59Z"
            />
            <path
                fill="#EA4335"
                d="M12 5.98c1.47 0 2.79.51 3.82 1.5l2.87-2.87C16.96 2.99 14.69 2 12 2A9.99 9.99 0 0 0 3.03 7.55l3.34 2.59C7.16 7.75 9.38 5.98 12 5.98Z"
            />
        </svg>
    );
}
