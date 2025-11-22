import React, { useMemo, useState } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    Box,
    Button,
    Typography,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    CircularProgress,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";

export default function HoldingsCard({
    holdings,
    loading,
    saving,
    onAdd,
    onDelete,
}) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        symbol: "",
        quantity: "",
        avgCost: "",
        currency: "USD",
    });

    const list = holdings || [];

    const totals = useMemo(() => {
        const totalMarketValue = list.reduce(
            (sum, h) => sum + (h.MarketValue ?? h.marketValue ?? 0),
            0
        );
        const totalPnL = list.reduce(
            (sum, h) => sum + (h.UnrealizedPnL ?? h.unrealizedPnL ?? 0),
            0
        );
        return { totalMarketValue, totalPnL };
    }, [list]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = () => {
        if (!form.symbol || !form.quantity || !form.avgCost) return;

        const payload = {
            symbol: form.symbol.trim().toUpperCase(),
            quantity: Number(form.quantity),
            avgCost: Number(form.avgCost),
            currency: form.currency || "USD",
            exchange: "US",
        };

        onAdd?.(payload);
        setOpen(false);
    };

    const hasHoldings = list.length > 0;

    return (
        <Card
            sx={{
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
            }}
        >
            <CardHeader
                title="Investments"
                subheader={
                    hasHoldings
                        ? `Total MV: $${totals.totalMarketValue.toFixed(
                              2
                          )} · PnL: $${totals.totalPnL.toFixed(2)}`
                        : "No investments yet"
                }
                action={
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                    >
                        Add
                    </Button>
                }
            />
            <CardContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={28} />
                    </Box>
                ) : !hasHoldings ? (
                    <Typography variant="body2" color="text.secondary">
                        You don't have any investments yet. Add your first
                        position to start tracking.
                    </Typography>
                ) : (
                    <Box sx={{ overflowX: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Symbol</TableCell>
                                    <TableCell align="right">Qty</TableCell>
                                    <TableCell align="right">
                                        Avg Cost
                                    </TableCell>
                                    <TableCell align="right">
                                        Price
                                    </TableCell>
                                    <TableCell align="right">MV</TableCell>
                                    <TableCell align="right">PnL</TableCell>
                                    <TableCell align="right">PnL %</TableCell>
                                    <TableCell align="center">
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {list.map((h) => {
                                    const symbol = h.Symbol ?? h.symbol;
                                    const qty = h.Quantity ?? h.quantity ?? 0;
                                    const avgCost =
                                        h.AvgCost ?? h.avgCost ?? 0;
                                    const price =
                                        h.CurrentPrice ??
                                        h.currentPrice ??
                                        0;
                                    const mv =
                                        h.MarketValue ??
                                        h.marketValue ??
                                        qty * price;
                                    const pnl =
                                        h.UnrealizedPnL ??
                                        h.unrealizedPnL ??
                                        0;
                                    const pnlPct =
                                        h.UnrealizedPnLPercent ??
                                        h.unrealizedPnLPercent ??
                                        0;

                                    return (
                                        <TableRow key={symbol}>
                                            <TableCell>{symbol}</TableCell>
                                            <TableCell align="right">
                                                {qty}
                                            </TableCell>
                                            <TableCell align="right">
                                                {avgCost.toFixed(2)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {price
                                                    ? price.toFixed(2)
                                                    : "-"}
                                            </TableCell>
                                            <TableCell align="right">
                                                {mv ? mv.toFixed(2) : "-"}
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    color:
                                                        pnl >= 0
                                                            ? "success.main"
                                                            : "error.main",
                                                }}
                                            >
                                                {pnl
                                                    ? pnl.toFixed(2)
                                                    : "-"}
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    color:
                                                        pnlPct >= 0
                                                            ? "success.main"
                                                            : "error.main",
                                                }}
                                            >
                                                {pnlPct
                                                    ? `${pnlPct.toFixed(2)}%`
                                                    : "-"}
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        onDelete?.(symbol)
                                                    }
                                                    disabled={saving}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </CardContent>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Add investment</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Symbol"
                            value={form.symbol}
                            onChange={handleChange("symbol")}
                            autoFocus
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Quantity"
                            type="number"
                            value={form.quantity}
                            onChange={handleChange("quantity")}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Avg Cost"
                            type="number"
                            value={form.avgCost}
                            onChange={handleChange("avgCost")}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Currency"
                            value={form.currency}
                            onChange={handleChange("currency")}
                            fullWidth
                            size="small"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}
