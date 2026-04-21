import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "@/components/ui/Spinner.jsx";
import { useApiClient } from "@/services/apiClient";

export default function OnboardingGate() {
    const { getMe } = useApiClient();
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const me = await getMe();
                if (me?.onboardingDone) navigate("/dashboard", { replace: true });
                else navigate("/onboarding", { replace: true });
            } catch (e) {
                // 401 is handled by apiClient (calls signOut), RequireAuth redirects to /login.
                if (e?.message?.includes("Session expired")) return;
                console.error("Failed to load /me", e);
                navigate("/onboarding", { replace: true });
            }
        })();
    }, [getMe, navigate]);

    return (
        <div className="mt-12 flex justify-center">
            <Spinner className="h-8 w-8" />
        </div>
    );
}
