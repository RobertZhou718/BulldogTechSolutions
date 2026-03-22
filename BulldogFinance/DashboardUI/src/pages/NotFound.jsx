import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button.jsx";
import Card from "@/components/ui/Card.jsx";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Card className="max-w-lg text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                    Error
                </p>
                <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-[var(--text-main)]">
                    404
                </h1>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--text-main)]">
                    Page not found
                </h2>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                    The page you are looking for doesn&apos;t exist. Maybe you followed an outdated link.
                </p>
                <div className="mt-6 flex justify-center">
                    <Button onClick={() => navigate("/")}>Back to dashboard</Button>
                </div>
            </Card>
        </div>
    );
}
