import React, { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "../services/apiClient";

export default function OnboardingGate() {
    const { getMe } = useApiClient();
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const me = await getMe();
                if (me?.onboardingDone) {
                    navigate("/dashboard", { replace: true });
                } else {
                    navigate("/onboarding", { replace: true });
                }
            } catch (e) {
                console.error("Failed to load /me", e);
                navigate("/onboarding", { replace: true });
            }
        })();
    }, [getMe, navigate]);

    return (
        <Box sx={{ mt: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
        </Box>
    );
}
