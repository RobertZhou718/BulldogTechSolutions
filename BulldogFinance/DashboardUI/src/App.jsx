import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
    AuthenticatedTemplate,
    UnauthenticatedTemplate,
} from "@azure/msal-react";
import MainLayout from "@/layout/MainLayout.jsx";
import AssistantPage from "@/pages/Assistant.jsx";
import DashboardPage from "@/pages/Dashboard.jsx";
import InvestmentsPage from "@/pages/Investments.jsx";
import LoginPage from "@/pages/Login.jsx";
import NotFoundPage from "@/pages/NotFound.jsx";
import OnboardingGate from "@/pages/OnboardingGate.jsx";
import OnboardingPage from "@/pages/Onboarding.jsx";
import TransactionsPage from "@/pages/Transactions.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <AuthenticatedTemplate>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<OnboardingGate />} />
                        <Route path="/onboarding" element={<OnboardingPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/transactions" element={<TransactionsPage />} />
                        <Route path="/investments" element={<InvestmentsPage />} />
                        <Route path="/assistant" element={<AssistantPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </MainLayout>
            </AuthenticatedTemplate>

            <UnauthenticatedTemplate>
                <Routes>
                    <Route path="*" element={<LoginPage />} />
                </Routes>
            </UnauthenticatedTemplate>
        </BrowserRouter>
    );
}
