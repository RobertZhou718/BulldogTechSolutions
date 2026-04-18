import React from "react";
import BulldogLogo from "@/assets/BulldogFinance.png";
import LoginSample from "@/assets/LoginSample_1.png";

const previewQuote = {
    quote:
        "Run every client account, transaction, and advisory workflow from a single secure workspace.",
    author: "Bulldog Finance",
    role: "External ID native authentication",
};

export default function AuthLayout({ children, subtitle, title }) {
    return (
        <div className="min-h-screen bg-[var(--color-gray-25)] lg:h-screen lg:overflow-hidden">
            <div className="grid min-h-screen lg:h-screen lg:grid-cols-[40%_60%]">
                <section className="flex min-h-screen flex-col border-r border-[var(--color-gray-200)] bg-white px-6 py-7 sm:px-10 lg:h-full lg:min-h-0 lg:px-12 lg:py-7 lg:overflow-hidden">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--accent-outline)] bg-[linear-gradient(180deg,#ffffff_0%,rgba(21,112,239,0.10)_100%)] shadow-[0_2px_10px_rgba(21,112,239,0.12)]">
                                <img
                                    src={BulldogLogo}
                                    alt="Bulldog Finance logo"
                                    className="h-7 w-7 rounded-[8px] object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--color-gray-900)]">
                                    Bulldog Finance
                                </p>
                                <p className="text-sm text-[var(--color-gray-500)]">
                                    Client operations platform
                                </p>
                            </div>
                        </div>
                        <p className="hidden text-sm text-[var(--color-gray-500)] sm:block">
                            Need help? Support
                        </p>
                    </div>

                    <div className="mx-auto flex w-full max-w-[410px] flex-1 items-center py-5 lg:py-4">
                        <div className="w-full space-y-5">
                            <div className="space-y-3">
                                <span className="inline-flex items-center rounded-full border border-[var(--color-gray-200)] bg-[var(--color-gray-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-gray-600)]">
                                    Secure sign-in
                                </span>
                                <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.04em] text-[var(--color-gray-900)]">
                                    {title}
                                </h1>
                                <p className="text-sm leading-6 text-[var(--color-gray-500)]">
                                    {subtitle}
                                </p>
                            </div>

                            <div className="rounded-[20px] border border-[var(--color-gray-200)] bg-white p-5 shadow-[var(--shadow-md)] sm:p-6">
                                {children}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-gray-500)]">
                        <p>&copy; Bulldog Tech Solutions 2026</p>
                        <p className="hidden sm:block">Built for modern advisory teams</p>
                    </div>
                </section>

                <section className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(150deg,#f8fbff_0%,#eef4ff_48%,#eef9f3_100%)] lg:block lg:h-full lg:min-h-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(21,112,239,0.18),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(18,183,106,0.16),transparent_22%),radial-gradient(circle_at_70%_80%,rgba(82,139,255,0.14),transparent_30%)]" />

                    <div className="relative flex h-full flex-col justify-between px-10 py-8 xl:px-14 xl:py-10">
                        <div className="max-w-[620px]">
                            <p className="text-[34px] font-semibold leading-[1.12] tracking-[-0.04em] text-[var(--color-gray-900)] xl:text-[38px]">
                                {previewQuote.quote}
                            </p>

                            <div className="mt-6 flex items-end justify-between gap-6">
                                <div>
                                    <p className="text-base font-semibold text-[var(--color-gray-900)]">
                                        {previewQuote.author}
                                    </p>
                                    <p className="text-sm text-[var(--color-gray-600)]">
                                        {previewQuote.role}
                                    </p>
                                </div>
                                <p className="text-[20px] leading-none tracking-[0.2em] text-[var(--color-gray-900)]">
                                    ★★★★★
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="overflow-hidden rounded-[24px] border border-[var(--color-gray-200)] bg-white shadow-[var(--shadow-xl)]">
                                <div className="flex items-center justify-between border-b border-[var(--color-gray-200)] px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                                        <span className="text-sm font-semibold text-[var(--color-gray-600)]">
                                            Bulldog Finance
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-[var(--color-gray-400)]">
                                        Dashboard preview
                                    </span>
                                </div>
                                <div className="bg-[var(--color-gray-25)] p-4 xl:p-5">
                                    <img
                                        src={LoginSample}
                                        alt="Bulldog Finance dashboard preview"
                                        className="max-h-[48vh] w-full rounded-[18px] border border-[var(--color-gray-200)] object-cover object-top shadow-[var(--shadow-lg)] xl:max-h-[50vh]"
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
