import React, { useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext.js";
import Spinner from "@/components/ui/Spinner.jsx";

export default function RequireAuth() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const hasInitialized = useRef(false);

    if (!isLoading) {
        hasInitialized.current = true;
    }

    if (!isAuthenticated && !isLoading) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (isLoading && !hasInitialized.current) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    return <Outlet />;
}
