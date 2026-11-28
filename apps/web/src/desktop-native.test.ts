import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyDesktopIpc } from "./desktop-native";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("desktop IPC handshake", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("marks the native bridge ready without receiving the directory path", async () => {
    const root = { dataset: { desktopIpc: "" } };
    invoke.mockResolvedValue(undefined);
    await verifyDesktopIpc(root);
    expect(invoke).toHaveBeenCalledWith("app_data_directory");
    expect(root.dataset.desktopIpc).toBe("ready");
    expect(await invoke.mock.results[0]?.value).toBeUndefined();
  });

  it("retries a transient startup IPC failure with a strict attempt bound", async () => {
    const root = { dataset: { desktopIpc: "" } };
    invoke.mockRejectedValueOnce(new Error("synthetic-transient")).mockResolvedValueOnce(undefined);
    await verifyDesktopIpc(root);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(root.dataset.desktopIpc).toBe("ready");
    expect(JSON.stringify(root)).not.toContain("synthetic-transient");
  });

  it("fails closed with no error detail in DOM", async () => {
    const root = { dataset: { desktopIpc: "" } };
    invoke.mockRejectedValue(new Error("synthetic-private-error"));
    await verifyDesktopIpc(root);
    expect(root.dataset.desktopIpc).toBe("unavailable");
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(root)).not.toContain("synthetic-private-error");
  });
});
