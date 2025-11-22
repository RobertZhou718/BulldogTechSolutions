import React from "react";
import {
    Box,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableSortLabel,
    Typography,
} from "@mui/material";

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
}

export default function TransactionTable({
    transactions,
    accountNames,
    sortField,
    sortDirection,
    onSortChange,
}) {
    const handleSort = (field) => {
        if (sortField === field) {
            onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
        } else {
            onSortChange(field, "desc");
        }
    };

    const renderAmount = (tx) => {
        const amount = tx.amount ?? 0;
        const currency = tx.currency || "CAD";
        const formatted = amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return `${currency} ${formatted}`;
    };

    return (
        <Paper
            sx={{
                p: 2,
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                width: "100%",
            }}
        >
            <Typography variant="h6" gutterBottom>
                Transaction history
            </Typography>
            {transactions.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                        No transactions yet. Add your first one above.
                    </Typography>
                </Box>
            ) : (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={sortField === "date"}
                                    direction={sortField === "date" ? sortDirection : "desc"}
                                    onClick={() => handleSort("date")}
                                >
                                    Date
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Account</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Note</TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={sortField === "amount"}
                                    direction={sortField === "amount" ? sortDirection : "desc"}
                                    onClick={() => handleSort("amount")}
                                >
                                    Amount
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.transactionId || tx.rowKey || tx.id}>
                                <TableCell>
                                    {formatDate(tx.occurredAtUtc || tx.occurredAt || tx.createdAtUtc)}
                                </TableCell>
                            <TableCell>
                                {accountNames?.[tx.accountId] || tx.accountName || tx.accountId}
                            </TableCell>
                                <TableCell>
                                    {tx.type === "EXPENSE" ? "Expense" : "Income"}
                                </TableCell>
                                <TableCell>{tx.category || "-"}</TableCell>
                                <TableCell>{tx.note || "-"}</TableCell>
                                <TableCell align="right" sx={{ color: tx.type === "EXPENSE" ? "error.main" : "success.main" }}>
                                    {tx.type === "EXPENSE" ? "-" : "+"} {renderAmount(tx)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
}
