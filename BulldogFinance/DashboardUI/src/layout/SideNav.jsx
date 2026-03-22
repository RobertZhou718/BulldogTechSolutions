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
            <div className="sticky top-[96px] rounded-[28px] border border-[var(--card-border)] bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                    Workspace
                </p>
                <nav className="mt-1 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                                        isActive
                                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
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
