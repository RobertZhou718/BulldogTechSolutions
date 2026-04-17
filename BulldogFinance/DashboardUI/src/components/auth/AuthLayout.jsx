import React from "react";
import BulldogLogo from "@/assets/BulldogFinance.png";
import LoginSample from "@/assets/LoginSample_1.png";

const previewQuote = {
    quote:
        "Keep every account, transaction, and advisory workflow in one secure client workspace.",
    author: "Bulldog Finance",
    role: "External ID native authentication",
};

export default function AuthLayout({ children, subtitle, title }) {
    return (
        <div className="min-h-screen bg-white">
            <div className="grid min-h-screen bg-white lg:grid-cols-[430px_minmax(0,1fr)]">
                <section className="flex min-h-screen flex-col bg-white px-8 py-8 sm:px-10 lg:px-12 lg:py-10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--accent-outline)] bg-[linear-gradient(180deg,#ffffff_0%,rgba(21,112,239,0.08)_100%)] shadow-[0_2px_10px_rgba(21,112,239,0.12)]">
                            <img
                                src={BulldogLogo}
                                alt="Bulldog Finance logo"
                                className="h-7 w-7 rounded-[8px] object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[var(--text-main)]">
                                Bulldog Finance
                            </p>
                            <p className="text-sm text-[var(--text-soft)]">
                                Secure client workspace
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-1 items-center py-10">
                        <div className="w-full max-w-[360px]">
                            <div className="space-y-2">
                                <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[var(--text-main)]">
                                    {title}
                                </h1>
                                <p className="text-sm leading-6 text-[var(--text-soft)]">
                                    {subtitle}
                                </p>
                            </div>

                            <div className="mt-8">{children}</div>
                        </div>
                    </div>

                    <p className="text-sm text-[var(--text-disabled)]">
                        &copy; Bulldog Tech Solutions 2026
                    </p>
                </section>

                <section className="relative hidden min-h-screen overflow-hidden border-l border-[var(--card-border)] bg-[#f7fbff] lg:block">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,112,239,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(18,183,106,0.10),transparent_24%),linear-gradient(180deg,#f7fbff_0%,#eef4fb_100%)]" />

                    <div className="relative flex h-full flex-col px-12 py-12 xl:px-16">
                        <div className="max-w-[520px]">
                            <p className="text-[38px] font-semibold leading-[1.12] tracking-[-0.04em] text-[var(--text-main)]">
                                {previewQuote.quote}
                            </p>

                            <div className="mt-8 flex items-end justify-between gap-6">
                                <div>
                                    <p className="text-base font-semibold text-[var(--text-main)]">
                                        {previewQuote.author}
                                    </p>
                                    <p className="text-sm text-[var(--text-soft)]">
                                        {previewQuote.role}
                                    </p>
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                                    Branded UI
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <div className="overflow-hidden rounded-[24px] border border-[var(--card-border)] bg-white shadow-[0_18px_50px_rgba(16,24,40,0.10)]">
                                <div className="flex items-center justify-between border-b border-[#e6edf5] px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                                        <span className="text-sm font-semibold text-[var(--text-muted)]">
                                            Bulldog Finance
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-[var(--text-disabled)]">
                                        Dashboard preview
                                    </span>
                                </div>
                                <div className="bg-[#fbfdff] p-4 xl:p-5">
                                    <img
                                        src={LoginSample}
                                        alt="Bulldog Finance dashboard preview"
                                        className="w-full rounded-[18px] border border-[#dbe7f3] object-cover shadow-[0_10px_30px_rgba(16,24,40,0.08)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
