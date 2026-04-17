import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils.js";

const baseClassName =
    "rounded-[12px] px-3 py-2 text-center text-sm font-semibold transition";

export default function AuthTabs({ active }) {
    return (
        <div className="grid grid-cols-2 rounded-[14px] border border-[var(--card-border)] bg-[var(--bg-subtle)] p-1">
            <NavLink
                to="/login"
                className={cn(
                    baseClassName,
                    active === "login"
                        ? "bg-white text-[var(--text-main)] shadow-[var(--shadow-xs)]"
                        : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                )}
            >
                Log in
            </NavLink>
            <NavLink
                to="/signup"
                className={cn(
                    baseClassName,
                    active === "signup"
                        ? "bg-white text-[var(--text-main)] shadow-[var(--shadow-xs)]"
                        : "text-[var(--text-soft)] hover:text-[var(--text-main)]"
                )}
            >
                Sign up
            </NavLink>
        </div>
    );
}
