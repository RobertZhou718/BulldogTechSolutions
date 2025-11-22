import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: "60vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 2,
            }}
        >
            <Typography variant="h3" fontWeight={600}>
                404
            </Typography>
            <Typography variant="h6">Page not found</Typography>
            <Typography variant="body2" color="text.secondary">
                The page you are looking for doesn&apos;t exist. Maybe you followed an
                outdated link.
            </Typography>
            <Button
                variant="contained"
                color="primary"
                sx={{ mt: 1 }}
                onClick={() => navigate("/")}
            >
                Back to dashboard
            </Button>
        </Box>
    );
}
