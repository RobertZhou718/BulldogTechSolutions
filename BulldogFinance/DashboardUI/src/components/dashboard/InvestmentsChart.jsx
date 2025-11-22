import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

export default function InvestmentsChart({ dates, portfolioSeries }) {
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
                    Investments
                </Typography>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Recent portfolio performance
                </Typography>

                <Box sx={{ flex: 1, minHeight: 260 }}>
                    <LineChart
                        height={260}
                        xAxis={[
                            {
                                scaleType: "point",
                                data: dates,
                            },
                        ]}
                        series={portfolioSeries}
                    />
                </Box>
            </CardContent>
        </Card>
    );
}
