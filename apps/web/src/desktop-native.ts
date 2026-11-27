import { invoke } from "@tauri-apps/api/core";

/**
 * Desktop-only startup handshake. No credentials, paths, learner content or
 * errors are displayed, persisted or logged. The root's neutral readiness
 * attribute supports non-secret native IPC smoke checks.
 */
export async function verifyDesktopIpc(
  root: { dataset: { desktopIpc?: string } } = document.documentElement,
): Promise<void> {
  try {
    const location = await invoke<string>("app_data_directory");
    root.dataset.desktopIpc = location.length > 0 ? "ready" : "unavailable";
  } catch {
    root.dataset.desktopIpc = "unavailable";
  }
}
