/**
 * This script must only be run deliberately with the Tauri QA-only config.
 * Builds an isolated entry into .git; NEVER writes to apps/web/dist. The
 * production shell remains byte-for-byte its accepted renderer.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tool = resolve(root, "node_modules", "vite", "bin", "vite.js");
const config = resolve(root, "apps", "web", "vite.visual-qa.config.ts");
const result = spawnSync(process.execPath, [tool, "build", "--config", config], {
  cwd: root,
  windowsHide: true,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Isolated native preview build failed: ${result.status}`);
