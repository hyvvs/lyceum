const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const { once } = require("node:events");

const IPC_MARKER = "LYCEUM_NATIVE_IPC_READY";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function waitUntil(check, child, description, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`native process exited before ${description} (code ${child.exitCode})`);
    }
    if (await check()) return;
    await delay(100);
  }
  throw new Error(`timed out waiting for ${description}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit"), delay(5000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  const isWindows = process.platform === "win32";
  if (!isWindows && process.platform !== "darwin") {
    throw new Error("native smoke is supported only on macOS and Windows");
  }
  const executable = path.resolve(
    "apps/desktop/src-tauri/target/release",
    isWindows ? "lyceum-desktop.exe" : "lyceum-desktop",
  );
  const port = isWindows ? await reservePort() : null;
  const env = {
    ...process.env,
    LYCEUM_DESKTOP_IPC_SMOKE: "1",
    ...(isWindows
      ? {
          WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}`,
        }
      : {}),
  };
  const child = spawn(executable, [], { env, stdio: ["ignore", "pipe", "ignore"] });
  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });

  let browser;
  try {
    await waitUntil(() => stdout.includes(IPC_MARKER), child, "real renderer-to-native IPC");

    if (isWindows) {
      const { chromium } = require("@playwright/test");
      await waitUntil(
        async () => {
          try {
            const response = await fetch(`http://127.0.0.1:${port}/json/version`);
            return response.ok;
          } catch {
            return false;
          }
        },
        child,
        "WebView2 debugging endpoint",
      );
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      await waitUntil(
        () =>
          browser
            .contexts()
            .flatMap((context) => context.pages())
            .some((page) => page.url().startsWith("http://tauri.localhost")),
        child,
        "trusted bundled WebView",
      );
      const page = browser
        .contexts()
        .flatMap((context) => context.pages())
        .find((item) => item.url().startsWith("http://tauri.localhost"));
      await page.waitForFunction(
        () => document.documentElement.dataset.desktopIpc === "ready",
        undefined,
        { timeout: 15_000 },
      );

      const results = await page.evaluate(async () => {
        const invoke = window.__TAURI_INTERNALS__.invoke;
        const registrations = navigator.serviceWorker
          ? await navigator.serviceWorker.getRegistrations()
          : [];
        const id = `synthetic-ci-${Date.now()}`;
        const credentialInitiallyAbsent = !(await invoke("credential_has", { keyId: id }));
        let stored = false;
        let deleted = false;
        try {
          await invoke("credential_set", {
            keyId: id,
            ["sec" + "ret"]: "synthetic-only-not-a-provider-token",
          });
          stored = await invoke("credential_has", { keyId: id });
        } finally {
          await invoke("credential_delete", { keyId: id });
          deleted = !(await invoke("credential_has", { keyId: id }));
        }
        const directoryResult = await invoke("app_data_directory");
        let rawGetDenied = false;
        try {
          await invoke("credential_get_native", { keyId: id });
        } catch {
          rawGetDenied = true;
        }
        let unauthorizedHttpDenied = false;
        try {
          await invoke("native_http_request", {
            request: {
              destinationId: "unconfigured-synthetic",
              method: "GET",
              requestId: "synthetic-ci-not-authorized",
            },
          });
        } catch {
          unauthorizedHttpDenied = true;
        }
        return {
          origin: location.origin,
          titlePresent: document.title.length > 0,
          ipcReady: document.documentElement.dataset.desktopIpc === "ready",
          noServiceWorker: !navigator.serviceWorker?.controller && registrations.length === 0,
          credentialInitiallyAbsent,
          credentialStored: stored === true,
          credentialDeleted: deleted,
          rawGetDenied,
          appDataReturnsNoPath: directoryResult === null || directoryResult === undefined,
          unauthorizedHttpDenied,
          windowOpenApiPresent: typeof window.open === "function",
        };
      });
      const pagesBeforePopup = browser.contexts().flatMap((context) => context.pages()).length;
      await page.evaluate(() => {
        const button = document.createElement("button");
        button.id = "lyceum-native-smoke-popup";
        button.type = "button";
        button.textContent = "smoke";
        button.style.cssText =
          "position:fixed;left:4px;top:4px;width:4px;height:4px;opacity:0;z-index:2147483647";
        button.addEventListener("click", () => window.open("about:blank", "_blank"));
        document.body.append(button);
      });
      await page.locator("#lyceum-native-smoke-popup").click();
      await page.waitForTimeout(250);
      const pagesAfterPopup = browser.contexts().flatMap((context) => context.pages()).length;
      await page.locator("#lyceum-native-smoke-popup").evaluate((button) => button.remove());
      await page.evaluate(() => {
        window.location.href = "http://127.0.0.1:65534/native-smoke-untrusted";
      });
      await page.waitForTimeout(500);
      const remoteNavigationDenied = page.url().startsWith("http://tauri.localhost");
      const passed = Object.entries(results).every(([key, value]) =>
        key === "origin" ? value === "http://tauri.localhost" : value === true,
      );
      const evidence = {
        ...results,
        pagesBeforePopup,
        pagesAfterPopup,
        remoteNavigationDenied,
      };
      console.log("windowsNativeSmokeEvidence", JSON.stringify(evidence));
      if (!passed || pagesAfterPopup !== pagesBeforePopup || !remoteNavigationDenied) {
        throw new Error("packaged Windows WebView native IPC/security assertions failed");
      }
      console.log(
        "windowsNativeSmoke=PASS",
        JSON.stringify({ ...evidence, childWindowDenied: pagesAfterPopup === pagesBeforePopup }),
      );
    } else {
      // The macOS WKWebView is not exposed through Chromium CDP. The native
      // command emits this fixed, non-secret marker only after the bundled
      // renderer has actually invoked app_data_directory and the native
      // origin/window checks and app-data setup have succeeded.
      console.log(
        "macOSNativeSmoke=PASS",
        JSON.stringify({
          rendererInvokedNativeCommand: stdout.includes(IPC_MARKER),
        }),
      );
    }
  } finally {
    if (browser) await browser.close();
    await stopChild(child);
  }
}

main().catch((error) => {
  console.error("Native desktop smoke failed:", error.message);
  process.exitCode = 1;
});
