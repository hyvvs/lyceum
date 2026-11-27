import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyDesktopIpc } from "./desktop-native";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("desktop IPC handshake", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("marks the native bridge ready without exposing the directory path", async () => {
    const root = { dataset: { desktopIpc: "" } };
    invoke.mockResolvedValue("C:\\Users\\example\\AppData\\Roaming\\Lyceum");
    await verifyDesktopIpc(root);
    expect(invoke).toHaveBeenCalledWith("app_data_directory");
    expect(root.dataset.desktopIpc).toBe("ready");
    expect(JSON.stringify(root)).not.toContain("AppData");
  });

  it("fails closed with no error detail in DOM", async () => {
    const root = { dataset: { desktopIpc: "" } };
    invoke.mockRejectedValue(new Error("synthetic-private-error"));
    await verifyDesktopIpc(root);
    expect(root.dataset.desktopIpc).toBe("unavailable");
    expect(JSON.stringify(root)).not.toContain("synthetic-private-error");
  });
});
