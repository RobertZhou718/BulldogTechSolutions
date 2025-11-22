import React from "react";
import {
    Box,
    Grid,
    MenuItem,
    Select,
    TextField,
    Typography,
    Paper,
    Button,
} from "@mui/material";

const TYPE_FILTER_OPTIONS = [
    { value: "ALL", label: "All" },
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

export default function TransactionFilters({ filters, onChange, onReset }) {
    const handleChange = (field, value) => {
        onChange({
            ...filters,
            [field]: value,
        });
    };

    return (
        <Paper
            sx={{
                p: 2,
                mb: 2,
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                width: "100%",
            }}
        >
            <Typography variant="subtitle1" gutterBottom>
                Filters
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                        Type
                    </Typography>
                    <Select
                        fullWidth
                        size="small"
                        value={filters.type}
                        onChange={(e) => handleChange("type", e.target.value)}
                    >
                        {TYPE_FILTER_OPTIONS.map((t) => (
                            <MenuItem key={t.value} value={t.value}>
                                {t.label}
                            </MenuItem>
                        ))}
                    </Select>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                        From
                    </Typography>
                    <TextField
                        type="date"
                        size="small"
                        fullWidth
                        value={filters.from}
                        onChange={(e) => handleChange("from", e.target.value)}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                        To
                    </Typography>
                    <TextField
                        type="date"
                        size="small"
                        fullWidth
                        value={filters.to}
                        onChange={(e) => handleChange("to", e.target.value)}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                        Category
                    </Typography>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Any"
                        value={filters.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                    />
                </Grid>
                <Grid
                    item
                    xs={12}
                    sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}
                >
                    <Button size="small" onClick={onReset}>
                        Reset filters
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
}
