import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Grid,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
    InputAdornment,
} from "@mui/material";

const TYPE_OPTIONS = [
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
];

const DEFAULT_CATEGORIES = [
    "General",
    "Food",
    "Groceries",
    "Rent",
    "Salary",
    "Investment",
    "Transport",
];

export default function TransactionForm({
    accounts,
    selectedAccountId,
    onAccountChange,
    onSubmit,
}) {
    const [accountId, setAccountId] = useState(selectedAccountId || "");
    const [type, setType] = useState("EXPENSE");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("General");
    const [note, setNote] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        if (selectedAccountId && selectedAccountId !== accountId) {
            setAccountId(selectedAccountId);
        }
    }, [selectedAccountId]);

    const currentAccount = accounts.find((a) => a.accountId === accountId);
    const currency = currentAccount?.currency || "CAD";

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!accountId || !amount) return;

        const numericAmount = parseFloat(amount);
        if (Number.isNaN(numericAmount) || numericAmount <= 0) return;

        const occurredAtUtc = new Date(date + "T00:00:00Z").toISOString();

        onSubmit({
            accountId,
            type,
            amount: numericAmount,
            category,
            note: note.trim(),
            occurredAtUtc,
            currency,
        });

        // 清空金额和备注，方便继续记下一笔
        setAmount("");
        setNote("");
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Add a transaction
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">
                            Account
                        </Typography>
                        <Select
                            fullWidth
                            size="small"
                            value={accountId}
                            onChange={(e) => {
                                setAccountId(e.target.value);
                                onAccountChange?.(e.target.value);
                            }}
                        >
                            {accounts.map((acc) => (
                                <MenuItem key={acc.accountId} value={acc.accountId}>
                                    {acc.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                            Type
                        </Typography>
                        <Select
                            fullWidth
                            size="small"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {TYPE_OPTIONS.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                            Date
                        </Typography>
                        <TextField
                            type="date"
                            size="small"
                            fullWidth
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">
                            Amount
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ step: "0.01" }}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {currency}
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">
                            Category
                        </Typography>
                        <Select
                            fullWidth
                            size="small"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {DEFAULT_CATEGORIES.map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                            Note (optional)
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button type="submit" variant="contained">
                            Save transaction
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
}
