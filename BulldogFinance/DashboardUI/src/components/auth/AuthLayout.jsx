import React from "react";
import BulldogLogo from "@/assets/BulldogFinance.png";
import LoginSample from "@/assets/LoginSample_1.png";

const previewQuote = {
    quote: "Run every client account, transaction, and advisory workflow from a single secure workspace.",
    author: "— Bulldog Finance",
    role: "Client operations platform",
};

export default function AuthLayout({ children, subtitle, title }) {
    return (
        <section className="grid min-h-screen grid-cols-1 bg-white lg:h-screen lg:grid-cols-[640px_1fr] lg:overflow-hidden">
            {/* Left panel */}
            <div className="flex w-full flex-col bg-white lg:h-full lg:overflow-hidden">
                {/* Logo — pinned at top, never moves between pages */}
                <header className="flex flex-shrink-0 items-center gap-3 px-8 pt-8">
                    <img
                        src={BulldogLogo}
                        alt="Bulldog Finance logo"
                        className="h-8 w-8 object-contain"
                    />
                    <div>
                        <p className="text-sm font-semibold text-[var(--color-gray-900)]">
                            Bulldog Finance
                        </p>
                        <p className="text-sm text-[var(--color-gray-500)]">
                            Client operations platform
                        </p>
                    </div>
                </header>

                {/* Scrollable content */}
                <div className="flex flex-1 justify-center overflow-y-auto px-4 py-10 md:px-8">
                    <div className="my-auto flex w-full flex-col gap-8 sm:max-w-[360px]">
                        {/* Heading */}
                        <div className="flex flex-col gap-2 md:gap-3">
                            <h1 className="text-xl font-semibold text-[var(--color-gray-900)] md:text-[30px] md:leading-[1.1] md:tracking-[-0.02em]">
                                {title}
                            </h1>
                            {subtitle ? (
                                <p className="text-sm leading-6 text-[var(--color-gray-500)]">
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>

                        {children}
                    </div>
                </div>

                <footer className="hidden flex-shrink-0 px-8 pb-8 lg:block">
                    <p className="text-sm text-[var(--color-gray-500)]">
                        &copy; Bulldog Tech Solutions 2026
                    </p>
                </footer>
            </div>

            {/* Right panel */}
            <div className="relative hidden w-full overflow-hidden bg-[var(--color-gray-25)] pt-24 pr-16 pl-20 lg:flex lg:flex-col lg:gap-20">
                {/* Quote */}
                <figure className="flex max-w-3xl flex-col gap-6">
                    <blockquote>
                        <p className="text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-[var(--color-gray-900)]">
                            {previewQuote.quote}
                        </p>
                    </blockquote>
                    <figcaption className="flex items-start gap-3">
                        <div className="flex-1">
                            <p className="text-lg font-semibold text-[var(--color-gray-900)]">
                                {previewQuote.author}
                            </p>
                            <cite className="text-sm font-medium not-italic text-[var(--color-gray-500)]">
                                {previewQuote.role}
                            </cite>
                        </div>
                        <p className="text-[20px] leading-none tracking-[0.2em] text-[var(--color-gray-900)]">
                            ★★★★★
                        </p>
                    </figcaption>
                </figure>

                {/* Mockup — absolutely positioned, extends beyond viewport, clipped by overflow-hidden */}
                <div className="relative">
                    <div className="absolute top-0 left-0 rounded-[24px] bg-white p-[4px] shadow-[0_24px_64px_rgba(0,0,0,0.13)] ring-1 ring-inset ring-[var(--color-gray-200)]">
                        <div className="rounded-[20px] bg-white p-[2px]">
                            <div className="overflow-hidden rounded-[17px] ring-1 ring-[var(--color-gray-200)]">
                                <img
                                    src={LoginSample}
                                    alt="Bulldog Finance dashboard preview"
                                    className="block h-[540px] max-w-none object-cover object-left-top"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
