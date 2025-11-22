import React from "react";
import { Box } from "@mui/material";
import TopBar, { APP_BAR_HEIGHT, DRAWER_WIDTH } from "./TopBar.jsx";
import SideNav from "./SideNav.jsx";

export default function MainLayout({ children }) {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <TopBar />
            <SideNav />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    bgcolor: "background.default",
                    p: 3,
                    mt: `${APP_BAR_HEIGHT}px`,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
