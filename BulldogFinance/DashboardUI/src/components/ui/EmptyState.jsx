import React from "react";
import Card from "./Card.jsx";

export default function EmptyState({ title, description, actions }) {
    return (
        <Card className="flex min-h-56 flex-col items-center justify-center text-center">
            <span className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-sm font-medium text-[var(--text-muted)]">
                Nothing here yet
            </span>
            <h2 className="mt-4 text-xl font-semibold text-[var(--text-main)]">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
            {actions ? <div className="mt-4">{actions}</div> : null}
        </Card>
    );
}
