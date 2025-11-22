import React, { useState } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    Box,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Typography,
    Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export default function WatchlistCard({
    items,
    loading,
    saving,
    onAdd,
    onDelete,
}) {
    const [symbol, setSymbol] = useState("");
    const [exchange, setExchange] = useState("US");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!symbol) return;

        onAdd?.(
            symbol.trim().toUpperCase(),
            (exchange || "US").trim().toUpperCase()
        );
        setSymbol("");
    };

    const list = items || [];
    const hasItems = list.length > 0;

    return (
        <Card
            sx={{
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
            }}
        >
            <CardHeader title="Watchlist" />
            <CardContent>
                <Box component="form" onSubmit={handleSubmit} mb={2}>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="Symbol"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Ex."
                            value={exchange}
                            onChange={(e) => setExchange(e.target.value)}
                            size="small"
                            sx={{ width: 80 }}
                        />
                        <IconButton
                            type="submit"
                            color="primary"
                            disabled={saving || !symbol}
                        >
                            <AddIcon />
                        </IconButton>
                    </Stack>
                </Box>

                {!hasItems && !loading ? (
                    <Typography variant="body2" color="text.secondary">
                        No symbols in your watchlist yet.
                    </Typography>
                ) : (
                    <List dense>
                        {list
                            .filter(
                                (w) => w && (w.Symbol || w.symbol)
                            )
                            .map((w, index) => {
                                const s = w.Symbol ?? w.symbol;
                                const ex =
                                    w.Exchange ?? w.exchange ?? "US";
                                const added =
                                    w.AddedAtUtc ??
                                    w.addedAtUtc ??
                                    null;

                                return (
                                    <ListItem
                                        key={s || index}
                                        disableGutters
                                        secondaryAction={
                                            <IconButton
                                                edge="end"
                                                size="small"
                                                onClick={() =>
                                                    onDelete?.(s)
                                                }
                                                disabled={saving}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemText
                                            primary={`${s} · ${ex}`}
                                            secondary={
                                                added
                                                    ? new Date(
                                                        added
                                                    ).toLocaleDateString()
                                                    : undefined
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                    </List>
                )}
            </CardContent>
        </Card>
    );
}
