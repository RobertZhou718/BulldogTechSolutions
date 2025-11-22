import React from "react";
import {
    AppBar,
    Toolbar,
    Box,
    Typography,
    Button,
    Avatar,
} from "@mui/material";
import { useMsal } from "@azure/msal-react";
import BulldogLogo from "../assets/BulldogFinance.png";
export const APP_BAR_HEIGHT = 64;
export const DRAWER_WIDTH = 260;

export default function TopBar() {
    const { accounts, instance } = useMsal();
    const account = accounts[0];
    const name = account?.name || account?.username || "User";
    const email = account?.username || "";

    const handleSignOut = () => {
        instance.logoutRedirect();
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                height: APP_BAR_HEIGHT,
                justifyContent: "center",
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(15,23,42,0.96)",
                backdropFilter: "blur(14px)",
            }}
        >
            <Toolbar
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    minHeight: APP_BAR_HEIGHT,
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <img
                        src={BulldogLogo}
                        alt="Bulldog Finance Logo"
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: "50%",
                        }}
                    />
                    <Typography variant="subtitle1" fontWeight={600}>
                        Bulldog Finance
                    </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                    <Box textAlign="right">
                        <Typography variant="body2">{name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {email}
                        </Typography>
                    </Box>
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "primary.main",
                            fontSize: 14,
                        }}
                    >
                        {name?.[0]?.toUpperCase() || "U"}
                    </Avatar>
                    <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={handleSignOut}
                    >
                        SIGN OUT
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
