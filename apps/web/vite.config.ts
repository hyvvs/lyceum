import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** A fresh web build no longer installs a caching service worker.
 * public/sw.js is a one-way retirement worker for existing installations. */
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
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
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
