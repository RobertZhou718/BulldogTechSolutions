import React from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import PublicOnlyRoute from "@/auth/core/PublicOnlyRoute.jsx";
import RequireAuth from "@/auth/core/RequireAuth.jsx";
import MainLayout from "@/layout/MainLayout.jsx";
import AssistantPage from "@/pages/Assistant.jsx";
import DashboardPage from "@/pages/Dashboard.jsx";
import InvestmentsPage from "@/pages/Investments.jsx";
import NotFoundPage from "@/pages/NotFound.jsx";
import OnboardingGate from "@/pages/OnboardingGate.jsx";
import OnboardingPage from "@/pages/Onboarding.jsx";
import TransactionsPage from "@/pages/Transactions.jsx";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "@/pages/auth/LoginPage.jsx";
import SignupPage from "@/pages/auth/SignupPage.jsx";

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
        </BrowserRouter>
    );
}
