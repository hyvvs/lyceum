import { invoke } from "@tauri-apps/api/core";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 50;

/**
 * Desktop-only startup handshake. No credentials, paths, learner content or
 * errors are displayed, persisted or logged. The root's neutral readiness
 * attribute supports non-secret native IPC smoke checks.
 */
export async function verifyDesktopIpc(
  root: { dataset: { desktopIpc?: string } } = document.documentElement,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      await invoke<void>("app_data_directory");
      root.dataset.desktopIpc = "ready";
      return;
    } catch {
      if (attempt + 1 === MAX_ATTEMPTS) {
        root.dataset.desktopIpc = "unavailable";
        return;
      }
      // Tauri can finish exposing the native IPC bridge just after the
      // bundled renderer's first module executes. Retry only this local,
      // read-only readiness call; never retry provider/network operations.
      await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}
