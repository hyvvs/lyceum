import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "lyceum-production-csp",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                mode === "desktop"
                  ? "connect-src 'self' ipc: http://ipc.localhost"
                  : "connect-src 'self'",
                "img-src 'self' data:",
                "font-src 'self'",
                "worker-src 'self'",
                "manifest-src 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
              ].join("; "),
            },
            injectTo: "head-prepend",
          },
        ];
      },
    },
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Lyceum — your private learning space",
        short_name: "Lyceum",
        description: "An on-device-first, accessible study workspace.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#101722",
        theme_color: "#101722",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        globIgnores: ["**/*.map"],
        maximumFileSizeToCacheInBytes: 2_000_000,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/$/, /^\/settings\/?$/],
        navigateFallbackDenylist: [/^\/(?:api|auth|uploads|private|provider|sync)(?:\/|$)/],
      },
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Keep the ICU formatter as a measured vendor chunk rather than
          // growing the initial app module beyond the 500 kB warning limit.
          groups: [
            {
              name: "icu-runtime",
              test: /[\\/]node_modules[\\/].*(?:intl-messageformat|@formatjs|i18next-icu)/,
            },
          ],
        },
      },
    },
  },
}));
