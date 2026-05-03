import React from "react";

export default function PageHeader({ eyebrow, title, description, actions, children }) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-5 rounded-[var(--radius-2xl)] border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-6 shadow-[var(--shadow-xs)] ring-1 ring-[var(--card-border)] backdrop-blur-sm xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                    {eyebrow ? (
                        <p className="text-sm font-semibold text-[var(--brand)]">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-main)] md:text-4xl">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-3 max-w-2xl text-base text-[var(--text-muted)]">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="w-full xl:w-auto">{actions}</div> : null}
            </div>
            {children}
        </div>
    );
}
