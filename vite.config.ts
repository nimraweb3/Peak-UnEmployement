import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig(async ({ mode, command }) => ({
  plugins: [
    react(),
    tailwind(),
    ...(mode === "demo" && command === "serve"
      ? [(await import("./scripts/demo-server.mjs")).demoPlugin()]
      : [cloudflare()]),
  ],
}));
