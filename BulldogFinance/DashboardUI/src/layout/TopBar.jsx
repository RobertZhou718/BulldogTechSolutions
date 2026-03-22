import React from "react";
import { useMsal } from "@azure/msal-react";
import { LogOut01 } from "@untitledui/icons";
import BulldogLogo from "@/assets/BulldogFinance.png";
import Button from "@/components/ui/Button.jsx";

export const APP_BAR_HEIGHT = 72;
export const DRAWER_WIDTH = 280;

export default function TopBar() {
    const { accounts, instance } = useMsal();
    const account = accounts[0];
    const name = account?.name || account?.username || "User";
    const email = account?.username || "";

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <img
                        src={BulldogLogo}
                        alt="Bulldog Finance Logo"
                        className="h-11 w-11 rounded-2xl object-cover"
                    />
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-main)]">
                            Bulldog Finance
                        </p>
                        <p className="text-sm text-[var(--text-soft)]">Portfolio workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden rounded-full bg-[var(--color-success-50)] px-3 py-1 text-sm font-medium text-[var(--color-success-700)] sm:inline-flex">
                        Live
                    </span>
                    <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium text-[var(--text-main)]">{name}</p>
                        <p className="text-sm text-[var(--text-soft)]">{email}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                        {name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <Button variant="secondary" onClick={() => instance.logoutRedirect()}>
                        <LogOut01 className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>
            </div>
        </header>
    );
}
