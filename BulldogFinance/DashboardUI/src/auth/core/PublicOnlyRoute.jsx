import React, { useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./authContext.js";
import Spinner from "@/components/ui/Spinner.jsx";

export default function PublicOnlyRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    const hasInitialized = useRef(false);

    if (!isLoading) {
        hasInitialized.current = true;
    }

    if (isLoading && !hasInitialized.current) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
