import React, { useState } from "react";
import { LogOut01 } from "@untitledui/icons";
import { Menu } from "lucide-react";
import { useAuth } from "@/auth/core/authContext.js";
import BulldogLogo from "@/assets/BulldogFinance.png";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { NavItems } from "./SideNav.jsx";

export const APP_BAR_HEIGHT = 72;
export const DRAWER_WIDTH = 280;

export default function TopBar() {
    const { isLoading, signOut, user } = useAuth();
    const name = user?.name || user?.username || "User";
    const email = user?.email || user?.username || "";
    const initials = user?.initials || name?.[0]?.toUpperCase() || "U";
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                aria-label="Open navigation"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-4">
                            <SheetHeader className="p-0">
                                <SheetTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                                    Workspace
                                </SheetTitle>
                            </SheetHeader>
                            <p className="text-sm text-[var(--text-muted)]">Portfolio management</p>
                            <div className="mt-4">
                                <NavItems onNavigate={() => setMobileNavOpen(false)} />
                            </div>
                        </SheetContent>
                    </Sheet>

                    <img
                        src={BulldogLogo}
                        alt="Bulldog Finance Logo"
                        className="h-11 w-11 rounded-[var(--radius-xl)] object-cover shadow-[var(--shadow-xs)]"
                    />
                    <div className="hidden sm:block">
                        <p className="text-sm font-semibold text-[var(--text-main)]">
                            Bulldog Finance
                        </p>
                        <p className="text-sm text-[var(--text-soft)]">Portfolio workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden rounded-full border border-[var(--color-success-100)] bg-[var(--color-success-50)] px-3 py-1 text-sm font-medium text-[var(--color-success-700)] sm:inline-flex">
                        Live
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                disabled={isLoading}
                                className="flex items-center gap-3 rounded-full border border-transparent p-1 pr-2 transition hover:border-[var(--card-border)] hover:bg-[var(--bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label="User menu"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--brand-outline)] bg-[var(--brand)] text-sm font-semibold text-white shadow-[var(--shadow-xs)]">
                                    {initials}
                                </span>
                                <span className="hidden text-left sm:block">
                                    <span className="block text-sm font-medium text-[var(--text-main)]">
                                        {name}
                                    </span>
                                    <span className="block text-xs text-[var(--text-soft)]">
                                        {email}
                                    </span>
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{name}</span>
                                    {email ? (
                                        <span className="text-xs font-normal text-muted-foreground">
                                            {email}
                                        </span>
                                    ) : null}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onSelect={() => void signOut()}
                                disabled={isLoading}
                                variant="destructive"
                            >
                                <LogOut01 className="h-4 w-4" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
