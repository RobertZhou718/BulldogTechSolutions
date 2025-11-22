import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";

export default function AccountsPieChart({ accounts }) {
    const seriesData = accounts.map((acc) => ({
        id: acc.id,
        value: acc.balance,
        label: acc.name,
    }));

    return (
        <Card
            sx={{
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Account allocation
                </Typography>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Personal finance summary
                </Typography>

                <Box sx={{ flex: 1, minHeight: 240 }}>
                    <PieChart
                        height={240}
                        series={[
                            {
                                data: seriesData,
                                innerRadius: 40,
                                outerRadius: 90,
                                paddingAngle: 2,
                                cornerRadius: 4,
                            },
                        ]}
                        slotProps={{
                            legend: {
                                direction: "column",
                                position: { vertical: "middle", horizontal: "right" },
                            },
                        }}
                    />
                </Box>
            </CardContent>
        </Card>
    );
}
