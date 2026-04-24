import { fileURLToPath } from "url";
import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@azure/msal")) return "msal";
          if (id.includes("react-plaid-link") || id.includes("plaid")) return "plaid";
          if (id.includes("radix-ui") || id.includes("@radix-ui")) return "radix";
          if (id.includes("react-aria") || id.includes("@react-stately") || id.includes("@react-aria")) return "react-aria";
          if (id.includes("react-router")) return "router";
          if (id.includes("sonner")) return "sonner";
          if (id.includes("@untitledui/icons") || id.includes("lucide-react") || id.includes("react-icons")) return "icons";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "date-picker";
          if (id.includes("react-dom") || id.includes("scheduler")) return "react-dom";
          if (/[\\/]react[\\/]/.test(id)) return "react";
        },
      },
    },
  },
});