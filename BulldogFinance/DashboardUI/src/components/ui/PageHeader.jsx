import React from "react";

export default function PageHeader({ eyebrow, title, description, actions, children }) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                    {eyebrow ? (
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-main)] md:text-4xl">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-3 max-w-2xl text-base text-[var(--text-muted)]">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions}
            </div>
            {children}
        </div>
    );
}
