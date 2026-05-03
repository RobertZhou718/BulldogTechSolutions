import React from "react";
import {
    Activity,
    BadgeCheck,
    Bot,
    CheckCircle2,
    Goal,
    Landmark,
    LockKeyhole,
    PiggyBank,
    ShieldCheck,
    TrendingUp,
    WalletCards,
} from "lucide-react";
import BulldogLogo from "@/assets/BulldogFinance.png";

const trustSignals = [
    { icon: ShieldCheck, label: "Connected securely" },
    { icon: BadgeCheck, label: "Goals stay visible" },
    { icon: LockKeyhole, label: "AI with private context" },
];

const productPillars = [
    {
        icon: WalletCards,
        label: "Centralized accounts",
        value: "8 connected",
        detail: "Checking, savings, credit, investments",
        tone: "text-[#84adff] bg-[#2e90fa]/14",
    },
    {
        icon: PiggyBank,
        label: "Savings goals",
        value: "72% funded",
        detail: "Emergency fund on track",
        tone: "text-[#fdb022] bg-[#f79009]/16",
    },
    {
        icon: TrendingUp,
        label: "Cashflow clarity",
        value: "+$2,840",
        detail: "Projected monthly surplus",
        tone: "text-[#75e0a7] bg-[#12b76a]/16",
    },
    {
        icon: Bot,
        label: "AI assistant",
        value: "Ask anything",
        detail: "Explains trends and next steps",
        tone: "text-[#c7b9ff] bg-[#7a5af8]/18",
    },
];

const accounts = [
    { name: "Everyday checking", amount: "$14,280" },
    { name: "High-yield savings", amount: "$36,950" },
    { name: "Investment account", amount: "$128,400" },
];

const cashflowBars = [
    "42%",
    "58%",
    "46%",
    "72%",
    "64%",
    "88%",
    "76%",
];

export default function AuthLayout({ children, subtitle, title }) {
    return (
        <section className="grid min-h-screen grid-cols-1 bg-[var(--color-gray-25)] lg:h-screen lg:grid-cols-[minmax(520px,600px)_1fr] lg:overflow-hidden">
            <div className="flex w-full flex-col bg-white lg:h-full lg:overflow-hidden">
                <header className="flex flex-shrink-0 items-center gap-3 px-6 pt-6 sm:px-8 sm:pt-8">
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

                <div className="flex flex-1 justify-center overflow-y-auto px-4 py-10 sm:px-8">
                    <div className="my-auto flex w-full flex-col gap-8 sm:max-w-[380px]">
                        <div className="flex flex-col gap-2 md:gap-3">
                            <h1 className="text-2xl font-semibold leading-tight text-[var(--color-gray-900)] md:text-[30px]">
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
                        @ Bulldog Tech Solutions {new Date().getFullYear()}
                    </p>
                </footer>
            </div>

            <div className="relative hidden overflow-hidden border-l border-[#20324a] bg-[#08111f] text-white lg:flex lg:flex-col">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,17,31,0)_0%,rgba(21,112,239,0.14)_46%,rgba(18,183,106,0.16)_72%,rgba(8,17,31,0)_100%),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_100%,64px_64px,64px_64px]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(180deg,rgba(245,158,11,0.14),rgba(21,112,239,0)_38%,rgba(18,183,106,0.12))]" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-7 px-10 py-10 xl:px-20 xl:py-12">
                    <div className="max-w-2xl">
                        <h2 className="max-w-xl text-4xl font-semibold leading-[1.08] text-white xl:text-5xl">
                            Centralize every account. See the next move clearly.
                        </h2>
                        <p className="mt-5 max-w-lg text-base leading-7 text-[#b9c7d8]">
                            Bulldog Finance brings connected accounts, savings goals, cashflow, and an AI assistant into one calm financial workspace.
                        </p>
                    </div>

                    <div className="grid max-w-5xl grid-cols-1 items-center gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                        <div className="relative min-h-[470px]">
                            <div className="auth-vault-shell absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 xl:h-[400px] xl:w-[400px]">
                                <div className="auth-vault-ring auth-vault-ring--outer" />
                                <div className="auth-vault-ring auth-vault-ring--middle" />
                                <div className="auth-vault-ring auth-vault-ring--inner" />
                                <div className="absolute inset-[29%] flex flex-col items-center justify-center rounded-full border border-white/18 bg-[#0d1b2f]/92 text-center shadow-[inset_0_1px_18px_rgba(255,255,255,0.08),0_26px_90px_rgba(21,112,239,0.3)]">
                                    <Landmark className="mb-3 h-10 w-10 text-[#d1e0ff]" aria-hidden="true" />
                                    <p className="text-xs font-medium uppercase text-[#98a2b3]">
                                        All accounts
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold text-white">
                                        $179,630
                                    </p>
                                </div>
                                <span className="auth-vault-node auth-vault-node--one">
                                    <WalletCards className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <span className="auth-vault-node auth-vault-node--two">
                                    <Goal className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <span className="auth-vault-node auth-vault-node--three">
                                    <Bot className="h-5 w-5" aria-hidden="true" />
                                </span>
                            </div>

                            <div className="absolute left-0 top-4 w-[290px] rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-white">
                                        Connected accounts
                                    </p>
                                    <span className="rounded-md bg-[#2e90fa]/16 px-2 py-1 text-xs font-semibold text-[#84adff]">
                                        Unified
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {accounts.map((account) => (
                                        <div key={account.name} className="flex items-center justify-between gap-3 rounded-md bg-[#07101d]/66 px-3 py-2">
                                            <span className="text-sm text-[#d0d5dd]">
                                                {account.name}
                                            </span>
                                            <span className="text-sm font-semibold text-white">
                                                {account.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="absolute right-0 top-12 w-[250px] rounded-lg border border-white/12 bg-[#f8fafc] p-4 text-[var(--color-gray-900)] shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                        Savings goal
                                    </p>
                                    <PiggyBank className="h-5 w-5 text-[var(--color-warning-500)]" aria-hidden="true" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="auth-goal-ring flex h-20 w-20 items-center justify-center rounded-full text-sm font-semibold text-[var(--color-gray-900)]">
                                        72%
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">
                                            Emergency fund
                                        </p>
                                        <p className="mt-1 text-sm text-[var(--color-gray-500)]">
                                            $18,000 of $25,000
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-2 left-10 w-[310px] rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase text-[#98a2b3]">
                                            Cashflow
                                        </p>
                                        <p className="mt-1 text-2xl font-semibold text-white">
                                            +$2,840
                                        </p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#12b76a]/16 text-[#75e0a7]">
                                        <TrendingUp className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                </div>
                                <div className="flex h-24 items-end gap-2 rounded-md border border-white/8 bg-[#07101d]/72 px-3 py-3">
                                    {cashflowBars.map((height, index) => (
                                        <span
                                            key={`${height}-${index}`}
                                            className="flex-1 rounded-t bg-[linear-gradient(180deg,#75e0a7,#1570ef)]"
                                            style={{ height }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="absolute bottom-8 right-0 w-[285px] rounded-lg border border-white/12 bg-[#f8fafc] p-4 text-[var(--color-gray-900)] shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#7a5af8]/12 text-[#6941c6]">
                                        <Bot className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">
                                            AI assistant
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-500)]">
                                            Context-aware guidance
                                        </p>
                                    </div>
                                </div>
                                <p className="rounded-md bg-[var(--color-gray-50)] px-3 py-2 text-sm leading-5 text-[var(--color-gray-700)]">
                                    Your cashflow can cover the goal transfer and still leave a $740 buffer.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {productPillars.map((pillar) => {
                                const Icon = pillar.icon;

                                return (
                                    <div
                                        key={pillar.label}
                                        className="rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_20px_56px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-md ${pillar.tone}`}>
                                                <Icon className="h-5 w-5" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[#98a2b3]">
                                                    {pillar.label}
                                                </p>
                                                <p className="mt-1 text-xl font-semibold text-white">
                                                    {pillar.value}
                                                </p>
                                                <p className="mt-1 text-sm leading-5 text-[#b9c7d8]">
                                                    {pillar.detail}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid max-w-4xl grid-cols-1 gap-3 xl:grid-cols-3">
                        {trustSignals.map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="flex items-center gap-3 rounded-lg border border-white/12 bg-white/10 px-4 py-3 text-sm font-medium text-[#d0d5dd] backdrop-blur"
                                >
                                    <Icon className="h-4 w-4 text-[#84adff]" aria-hidden="true" />
                                    <span>{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
