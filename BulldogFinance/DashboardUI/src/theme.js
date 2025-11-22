import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#22c55e" },
        secondary: { main: "#38bdf8" },
        background: {
            default: "#020617",
            paper: "#020617",
        },
    },
    shape: {
        borderRadius: 18,
    },
    typography: {
        fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
    },
});

export default theme;
