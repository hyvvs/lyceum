import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = resolve(import.meta.dirname, "../../tests/fixtures/native-visual-qa");

/**
 * Opt-in fixture-only Vite build. Not referenced by apps/web/vite.config.ts,
 * ordinary web builds, Tauri release build or PWA. All output stays untracked
 * under .git and cannot accidentally enter apps/web/dist.
 */
export default defineConfig({
  root,
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(root, "../../../.git/m0-005-visual-native/dist"),
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      input: resolve(root, "index.html"),
    },
  },
});
