import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Container,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
    CircularProgress,
    InputAdornment,
} from "@mui/material";
import { Add as AddIcon, DeleteOutline as DeleteIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "../services/apiClient";

const ACCOUNT_TYPES = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank account" },
    { value: "credit", label: "Credit card" },
    { value: "investment", label: "Investment" },
];

const CURRENCIES = ["CAD", "USD", "CNY", "EUR"];

export default function OnboardingPage() {
    const { getMe, postOnboarding } = useApiClient();
    const navigate = useNavigate();

    const [loadingMe, setLoadingMe] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [defaultCurrency, setDefaultCurrency] = useState("CAD");

    const [rows, setRows] = useState([
        { id: 1, name: "Cash", type: "cash", currency: "CAD", initialBalance: "" },
        { id: 2, name: "Chequing", type: "bank", currency: "CAD", initialBalance: "" },
    ]);

    // 进入页面先看 /me，已经 onboarding 的直接跳 dashboard
    useEffect(() => {
        (async () => {
            try {
                const me = await getMe();
                if (me?.onboardingDone) {
                    navigate("/dashboard", { replace: true });
                    return;
                }
                if (me?.defaultCurrency) {
                    setDefaultCurrency(me.defaultCurrency);
                    setRows((prev) =>
                        prev.map((r) => ({ ...r, currency: me.defaultCurrency }))
                    );
                }
            } catch (e) {
                console.error("Failed to load /me", e);
                // 出错也不阻塞用户填写，保持默认 CAD
            } finally {
                setLoadingMe(false);
            }
        })();
    }, [getMe, navigate]);

    const handleRowChange = (id, field, value) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const handleAddRow = () => {
        const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
        setRows((prev) => [
            ...prev,
            {
                id: nextId,
                name: "",
                type: "cash",
                currency: defaultCurrency,
                initialBalance: "",
            },
        ]);
    };

    const handleRemoveRow = (id) => {
        if (rows.length === 1) return; // 至少保留一行
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const totalInitial = useMemo(
        () =>
            rows.reduce((sum, r) => {
                const v = parseFloat(r.initialBalance || "0");
                return sum + (isNaN(v) ? 0 : v);
            }, 0),
        [rows]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const cleanedAccounts = rows
                .map((r) => ({
                    name: (r.name || "").trim(),
                    type: r.type || "cash",
                    currency: r.currency || defaultCurrency,
                    initialBalance: parseFloat(r.initialBalance || "0") || 0,
                }))
                .filter((a) => a.name.length > 0);

            if (!cleanedAccounts.length) {
                setError("Please enter at least one account.");
                setSaving(false);
                return;
            }

            const payload = {
                defaultCurrency,
                accounts: cleanedAccounts,
            };

            await postOnboarding(payload);

            navigate("/dashboard", { replace: true });
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to save onboarding information.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingMe) {
        return (
            <Box sx={{ mt: 8, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    Welcome to Bulldog Finance
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    Before we start tracking your money, let’s set up your accounts and their current
                    balances. You can always add or edit accounts later.
                </Typography>

                <Box sx={{ mt: 3, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Default currency
                    </Typography>
                    <Select
                        size="small"
                        value={defaultCurrency}
                        onChange={(e) => {
                            const value = e.target.value;
                            setDefaultCurrency(value);
                            setRows((prev) =>
                                prev.map((r) => ({ ...r, currency: r.currency || value }))
                            );
                        }}
                    >
                        {CURRENCIES.map((c) => (
                            <MenuItem key={c} value={c}>
                                {c}
                            </MenuItem>
                        ))}
                    </Select>
                </Box>

                <Divider sx={{ my: 2 }} />

                <form onSubmit={handleSubmit}>
                    <Typography variant="subtitle1" gutterBottom>
                        Your accounts
                    </Typography>

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {rows.map((row) => (
                            <React.Fragment key={row.id}>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Account name"
                                        fullWidth
                                        size="small"
                                        value={row.name}
                                        onChange={(e) =>
                                            handleRowChange(row.id, "name", e.target.value)
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Select
                                        size="small"
                                        fullWidth
                                        value={row.type}
                                        onChange={(e) =>
                                            handleRowChange(row.id, "type", e.target.value)
                                        }
                                    >
                                        {ACCOUNT_TYPES.map((t) => (
                                            <MenuItem key={t.value} value={t.value}>
                                                {t.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <Select
                                        size="small"
                                        fullWidth
                                        value={row.currency || defaultCurrency}
                                        onChange={(e) =>
                                            handleRowChange(row.id, "currency", e.target.value)
                                        }
                                    >
                                        {CURRENCIES.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {c}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Grid>
                                <Grid item xs={6} md={2}>
                                    <TextField
                                        label="Initial balance"
                                        type="number"
                                        fullWidth
                                        size="small"
                                        value={row.initialBalance}
                                        onChange={(e) =>
                                            handleRowChange(row.id, "initialBalance", e.target.value)
                                        }
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    {row.currency || defaultCurrency}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={1} sx={{ display: "flex", alignItems: "center" }}>
                                    <IconButton
                                        aria-label="Remove account"
                                        onClick={() => handleRemoveRow(row.id)}
                                        disabled={rows.length === 1}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Grid>
                            </React.Fragment>
                        ))}
                    </Grid>

                    <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Button
                            type="button"
                            variant="text"
                            startIcon={<AddIcon />}
                            onClick={handleAddRow}
                        >
                            Add another account
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            Total initial balance: {defaultCurrency}{" "}
                            {totalInitial.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Typography>
                    </Box>

                    {error && (
                        <Typography sx={{ mt: 2 }} color="error">
                            {error}
                        </Typography>
                    )}

                    <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                        >
                            {saving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                            Save and continue
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
}
