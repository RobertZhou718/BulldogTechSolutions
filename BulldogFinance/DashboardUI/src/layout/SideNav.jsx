import React from "react";
import {
    Drawer,
    Box,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useLocation, useNavigate } from "react-router-dom";
import { APP_BAR_HEIGHT, DRAWER_WIDTH } from "./TopBar.jsx";

const navItems = [
    {
        label: "Dashboard",
        path: "/",
        icon: <DashboardRoundedIcon fontSize="small" />,
    },
    {
        label: "Transactions",
        path: "/transactions",
        icon: <ReceiptLongIcon fontSize="small" />,
    },
    {
        label: "Investments",
        path: "/investments",
        icon: <ShowChartIcon fontSize="small" />,
    },
];

export default function SideNav() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: DRAWER_WIDTH,
                    boxSizing: "border-box",
                    bgcolor: "background.default",
                    borderRight: "1px solid rgba(148,163,184,0.25)",
                    top: APP_BAR_HEIGHT, // 👈 从 AppBar 下方开始
                    height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
                },
            }}
        >
            <Box sx={{ overflow: "auto", pt: 1 }}>
                <List
                    subheader={
                        <ListSubheader
                            component="div"
                            disableSticky
                            sx={{
                                bgcolor: "transparent",
                                color: "text.secondary",
                                fontSize: 11,
                                letterSpacing: 0.8,
                            }}
                        >
                            OVERVIEW
                        </ListSubheader>
                    }
                >
                    {navItems.map((item) => (
                        <ListItemButton
                            key={item.path}
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                mb: 0.5,
                                "&.Mui-selected": {
                                    bgcolor: "rgba(34,197,94,0.16)",
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{ fontSize: 14 }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
}
