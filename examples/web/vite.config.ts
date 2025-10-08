// import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import vercel from 'vite-plugin-vercel';

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({}),
    react(),
    vercel(),
    // VitePWA({
    //   registerType: "autoUpdate",
    //   manifest: {
    //     name: "open-chat",
    //     short_name: "open-chat",
    //     description: "open-chat - PWA Application",
    //     theme_color: "#0c0c0c",
    //   },
    //   pwaAssets: { disabled: false, config: true },
    //   devOptions: { enabled: true },
    // })
  ],
  server: {
    // Using LocalCan to expose localhost:3001
    // to my local internet but with HTTPS.
    // This is an NGROK tunnel alternative.
    allowedHosts: ["open-chat.local"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  }
});
