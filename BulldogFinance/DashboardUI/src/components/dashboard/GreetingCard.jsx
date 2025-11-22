import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

export default function GreetingCard({ name, total }) {
    return (
        <Card
            sx={{
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
            }}
        >
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Welcome back
                </Typography>
                <Typography variant="h5" sx={{ mb: 1 }}>
                    Good to see you, {name || "Investor"} 👋
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Here is a quick overview of your aggregated balance across all linked
                    accounts.
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                    Total net worth (all accounts)
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.5 }}>
                    {total.toLocaleString("en-CA", {
                        style: "currency",
                        currency: "CAD",
                        maximumFractionDigits: 0,
                    })}
                </Typography>
            </CardContent>
        </Card>
    );
}
