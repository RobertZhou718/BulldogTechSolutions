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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("@azure/msal-browser")) {
            return "vendor-auth";
          }

          if (id.includes("react-plaid-link")) {
            return "vendor-banking";
          }

          if (
            id.includes("react-dom") ||
            id.includes("react-router-dom") ||
            id.includes("\\react\\") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("react-aria-components") ||
            id.includes("@untitledui/icons") ||
            id.includes("react-icons")
          ) {
            return "vendor-ui";
          }

          return "vendor";
        },
      },
    },
  },
});
