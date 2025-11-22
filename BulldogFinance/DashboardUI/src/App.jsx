import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import "./App.css";
import theme from "./theme";
import LoginPage from "./pages/Login.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import TransactionsPage from "./pages/Transactions.jsx";
import InvestmentsPage from "./pages/Investments.jsx";
import NotFoundPage from "./pages/NotFound.jsx";
import OnboardingPage from "./pages/Onboarding.jsx";
import OnboardingGate from "./pages/OnboardingGate.jsx";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthenticatedTemplate>
          <MainLayout>
            <Routes>
              <Route path="/" element={<OnboardingGate />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/investments" element={<InvestmentsPage />} />
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
    </ThemeProvider>
  );
}
