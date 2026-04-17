import React from "react";
import { BarChartSquare02, Coins01, HomeLine, MessageChatCircle } from "@untitledui/icons";
import { NavLink } from "react-router-dom";

const navItems = [
    { label: "Dashboard", path: "/", icon: HomeLine },
    { label: "Transactions", path: "/transactions", icon: Coins01 },
    { label: "Investments", path: "/investments", icon: BarChartSquare02 },
    { label: "Bulldog assistance", path: "/assistant", icon: MessageChatCircle },
];

export default function SideNav() {
    return (
        <aside className="hidden w-[280px] shrink-0 lg:block">
            <div className="sticky top-[104px] rounded-[var(--radius-2xl)] border border-[var(--card-border)] bg-white/78 p-4 shadow-[var(--surface-shadow)] ring-1 ring-white/70 backdrop-blur-sm">
                <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--text-soft)]">Workspace</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Portfolio management</p>
                </div>
                <nav className="mt-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-[var(--radius-xl)] px-3 py-3 text-sm font-medium transition ${
                                        isActive
                                            ? "border border-[var(--accent-outline)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[var(--shadow-xs)]"
                                            : "border border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"
                                    }`
                                }
                            >
                                <Icon className="h-5 w-5" />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
