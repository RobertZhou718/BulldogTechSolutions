import React, { Suspense, lazy } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import PublicOnlyRoute from "@/auth/core/PublicOnlyRoute.jsx";
import RequireAuth from "@/auth/core/RequireAuth.jsx";
import Spinner from "@/components/ui/Spinner.jsx";
import TopProgressBar from "@/components/ui/TopProgressBar.jsx";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const MainLayout = lazy(() => import("@/layout/MainLayout.jsx"));
const AssistantPage = lazy(() => import("@/pages/Assistant.jsx"));
const DashboardPage = lazy(() => import("@/pages/Dashboard.jsx"));
const InvestmentsPage = lazy(() => import("@/pages/Investments.jsx"));
const NotFoundPage = lazy(() => import("@/pages/NotFound.jsx"));
const OnboardingGate = lazy(() => import("@/pages/OnboardingGate.jsx"));
const OnboardingPage = lazy(() => import("@/pages/Onboarding.jsx"));
const TransactionsPage = lazy(() => import("@/pages/Transactions.jsx"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage.jsx"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage.jsx"));
const SignupPage = lazy(() => import("@/pages/auth/SignupPage.jsx"));

function ProtectedShell() {
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <TooltipProvider delayDuration={200}>
                <TopProgressBar />
                <Toaster position="top-right" richColors closeButton />
                <Suspense
                fallback={(
                    <div className="flex min-h-screen items-center justify-center">
                        <Spinner className="h-8 w-8" />
                    </div>
                )}
            >
                <Routes>
                    <Route element={<PublicOnlyRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    </Route>

                    <Route element={<RequireAuth />}>
                        <Route element={<ProtectedShell />}>
                            <Route path="/" element={<OnboardingGate />} />
                            <Route path="/onboarding" element={<OnboardingPage />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/transactions" element={<TransactionsPage />} />
                            <Route path="/investments" element={<InvestmentsPage />} />
                            <Route path="/assistant" element={<AssistantPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>
                    </Route>
                </Routes>
                </Suspense>
            </TooltipProvider>
        </BrowserRouter>
    );
}
