import React, { useMemo } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Chip,
    Link,
    Typography,
} from "@mui/material";

export default function NewsCard({ overview, loading }) {
    const items = useMemo(() => {
        if (!overview) return [];

        const holdingsRaw = overview.Holdings ?? overview.holdings ?? [];
        const popularRaw = overview.Popular ?? overview.popular ?? [];

        const fromHoldings = holdingsRaw.flatMap((h) => {
            const symbol = h.Symbol ?? h.symbol;
            const newsArr = h.News ?? h.news ?? [];
            return newsArr.map((n) => ({
                id: n.Id ?? n.id ?? `${symbol}-${n.Datetime ?? n.datetime}`,
                symbol,
                headline: n.Headline ?? n.headline,
                source: n.Source ?? n.source,
                datetime: n.Datetime ?? n.datetime,
                url: n.Url ?? n.url,
            }));
        });

        const fromPopular = popularRaw.flatMap((p) => {
            const symbol = p.Symbol ?? p.symbol;
            const newsArr = p.News ?? p.news ?? [];
            return newsArr.map((n) => ({
                id: n.Id ?? n.id ?? `${symbol}-${n.Datetime ?? n.datetime}`,
                symbol,
                headline: n.Headline ?? n.headline,
                source: n.Source ?? n.source,
                datetime: n.Datetime ?? n.datetime,
                url: n.Url ?? n.url,
            }));
        });

        const list =
            fromHoldings.length > 0 ? fromHoldings : fromPopular;

        list.sort((a, b) => {
            const da = a.datetime ? new Date(a.datetime).getTime() : 0;
            const db = b.datetime ? new Date(b.datetime).getTime() : 0;
            return db - da;
        });

        return list.slice(0, 8);
    }, [overview]);

    return (
        <Card
            sx={{
                bgcolor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
            }}
        >
            <CardHeader title="Latest news" />
            <CardContent>
                {loading && items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Loading news...
                    </Typography>
                ) : items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No recent news available.
                    </Typography>
                ) : (
                    <List dense>
                        {items.map((n) => (
                            <ListItem
                                key={`${n.id}-${n.symbol}`}
                                alignItems="flex-start"
                                disableGutters
                                sx={{ mb: 1 }}
                            >
                                <Chip
                                    label={n.symbol}
                                    size="small"
                                    sx={{
                                        mr: 1,
                                        height: 20,
                                        fontSize: 11,
                                    }}
                                />
                                <ListItemText
                                    primary={
                                        <Link
                                            href={n.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            underline="hover"
                                            color="inherit"
                                        >
                                            {n.headline}
                                        </Link>
                                    }
                                    secondary={
                                        n.source || n.datetime
                                            ? `${n.source ?? ""} · ${n.datetime
                                                ? new Date(
                                                    n.datetime
                                                ).toLocaleDateString()
                                                : ""
                                            }`
                                            : null
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
}
