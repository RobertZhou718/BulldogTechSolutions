import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./authContext.js";
import Spinner from "@/components/ui/Spinner.jsx";

export default function PublicOnlyRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
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
