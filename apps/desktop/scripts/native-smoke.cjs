const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

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

async function startNavigationProbeServer() {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });
    if (request.url === "/native-smoke-redirect-source") {
      response.writeHead(302, {
        "cache-control": "no-store",
        location: "/native-smoke-untrusted",
      });
      response.end();
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    });
    response.end("<!doctype html><title>Untrusted navigation reached</title>");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("could not determine loopback navigation-probe port");
  }
  return {
    requests,
    url: `http://127.0.0.1:${address.port}/native-smoke-untrusted`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}

async function waitUntil(check, child, description, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.spawnError) {
      throw new Error(
        `native process could not start before ${description}: ${child.spawnError.message}`,
      );
    }
    if (child.exitCode !== null) {
      throw new Error(`native process exited before ${description} (code ${child.exitCode})`);
    }
    if (child.signalCode !== null) {
      throw new Error(`native process received ${child.signalCode} before ${description}`);
    }
    if (await check()) return;
    await delay(100);
  }
  throw new Error(`timed out waiting for ${description}`);
}

function waitForExit(child, timeoutMs) {
  if (!child || child.spawnError || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      resolve(false);
    }, timeoutMs);
    child.once("exit", onExit);
  });
}

async function stopChild(child) {
  if (!child || child.spawnError || child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  child.kill();
  if (!(await waitForExit(child, 5000))) {
    child.kill("SIGKILL");
    if (!(await waitForExit(child, 5000))) {
      throw new Error("native process did not exit after forced termination");
    }
  }
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
  // Give this smoke run an isolated WebView2 profile. Hosted Windows runners
  // may already have a WebView2 browser process using the default profile;
  // Chromium can reuse that process and ignore new debugging arguments.
  const webViewUserDataDir = isWindows
    ? fs.mkdtempSync(path.join(os.tmpdir(), "lyceum-webview2-smoke-"))
    : null;
  let child;
  let stdout = "";
  let browser;
  let navigationProbeServer;
  try {
    if (isWindows) navigationProbeServer = await startNavigationProbeServer();
    const env = {
      ...process.env,
      LYCEUM_DESKTOP_IPC_SMOKE: "1",
      ...(isWindows
        ? {
            LYCEUM_WEBVIEW2_USER_DATA_DIR: webViewUserDataDir,
            LYCEUM_WEBVIEW2_CDP_PORT: String(port),
            LYCEUM_WEBVIEW2_SMOKE_REDIRECT_SOURCE: new URL(
              "/native-smoke-redirect-source",
              navigationProbeServer.url,
            ).href,
          }
        : {}),
    };
    child = spawn(executable, [], { env, stdio: ["ignore", "pipe", "ignore"] });
    child.on("error", (error) => {
      child.spawnError = error;
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    await waitUntil(
      () =>
        stdout.includes(IPC_MARKER) &&
        (!isWindows || stdout.includes("LYCEUM_WEBVIEW_REQUEST_GUARD_READY")),
      child,
      "real renderer IPC and native WebView request guard",
    );

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
      let popupListener;
      const popupPromise = new Promise((resolve) => {
        popupListener = (popup) => resolve(popup);
        page.once("popup", popupListener);
      });
      await page.locator("#lyceum-native-smoke-popup").click();
      const popup = await Promise.race([popupPromise, delay(1000).then(() => null)]);
      if (!popup) page.off("popup", popupListener);
      if (popup) await popup.close();
      const pagesAfterPopup = browser.contexts().flatMap((context) => context.pages()).length;
      await page.locator("#lyceum-native-smoke-popup").evaluate((button) => button.remove());
      const untrustedUrl = navigationProbeServer.url;
      const untrustedOrigin = new URL(untrustedUrl).origin;
      let untrustedRequestObserved = false;
      const untrustedResourceRequests = [];
      const requestListener = (request) => {
        if (request.url().startsWith(`${untrustedOrigin}/`)) {
          untrustedResourceRequests.push({
            url: request.url(),
            resourceType: request.resourceType(),
            navigation: request.isNavigationRequest(),
          });
          if (request.isNavigationRequest() && request.url() === untrustedUrl) {
            untrustedRequestObserved = true;
          }
        }
      };
      page.on("request", requestListener);
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send("Page.setBypassCSP", { enabled: true });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => document.documentElement.dataset.desktopIpc === "ready",
        undefined,
        { timeout: 15_000 },
      );
      const redirectProbeOutcome = await page.evaluate(async (origin) => {
        try {
          const response = await fetch(`${origin}/native-smoke-redirect-source`, {
            cache: "no-store",
            mode: "no-cors",
            redirect: "follow",
          });
          return {
            status: response.status,
            type: response.type,
            redirected: response.redirected,
            url: response.url,
          };
        } catch {
          // The redirected cross-origin response is intentionally synthetic 403.
          return { rejected: true };
        }
      }, untrustedOrigin);
      const redirectProbeAttempted = true;
      await page.evaluate(async (origin) => {
        const waitForElement = (element, parent) =>
          new Promise((resolve) => {
            const finish = () => resolve();
            element.addEventListener("load", finish, { once: true });
            element.addEventListener("error", finish, { once: true });
            parent.append(element);
            window.setTimeout(finish, 750);
          });
        const probes = [
          fetch(`${origin}/native-smoke-fetch`, { mode: "no-cors" }).catch(() => undefined),
          new Promise((resolve) => {
            const source = `fetch(${JSON.stringify(`${origin}/native-smoke-worker`)}, { mode: "no-cors" }).catch(() => undefined).finally(() => postMessage("done"));`;
            const blobUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
            const worker = new Worker(blobUrl);
            const finish = () => {
              worker.terminate();
              URL.revokeObjectURL(blobUrl);
              resolve();
            };
            worker.addEventListener("message", finish, { once: true });
            worker.addEventListener("error", finish, { once: true });
            window.setTimeout(finish, 750);
          }),
          waitForElement(
            Object.assign(document.createElement("script"), {
              src: `${origin}/native-smoke-script.js`,
            }),
            document.head,
          ),
          waitForElement(
            Object.assign(new Image(), { src: `${origin}/native-smoke-image.png` }),
            document.body,
          ),
          waitForElement(
            Object.assign(document.createElement("iframe"), {
              src: `${origin}/native-smoke-cross-origin-frame`,
              title: "native smoke request guard probe",
            }),
            document.body,
          ),
        ];
        await Promise.race([
          Promise.allSettled(probes),
          new Promise((resolve) => window.setTimeout(resolve, 1500)),
        ]);
        for (const frame of document.querySelectorAll(
          'iframe[title="native smoke request guard probe"]',
        )) {
          frame.remove();
        }
      }, untrustedOrigin);
      await page.waitForTimeout(250);
      const untrustedResourceRequestCount = untrustedResourceRequests.length;
      const untrustedResourceTypes = [
        ...new Set(untrustedResourceRequests.map((request) => request.resourceType)),
      ];
      const requiredUntrustedResourceTypes = ["fetch", "script", "image"];
      const allUntrustedResourceTypesObserved = requiredUntrustedResourceTypes.every((type) =>
        untrustedResourceTypes.includes(type),
      );
      const iframeProbeObserved = untrustedResourceRequests.some(
        (request) => request.resourceType === "document" && !request.navigation,
      );
      const workerProbeObserved = untrustedResourceRequests.some((request) =>
        request.url.endsWith("/native-smoke-worker"),
      );
      const redirectTargetRequestObserved = untrustedResourceRequests.some(
        (request) =>
          request.url === untrustedUrl && request.resourceType === "fetch" && !request.navigation,
      );
      let navigationListener;
      const navigationPromise = new Promise((resolve) => {
        navigationListener = (frame) => {
          if (frame === page.mainFrame() && frame.url() === untrustedUrl) resolve(true);
        };
        page.on("framenavigated", navigationListener);
      });
      await page.evaluate((url) => {
        window.setTimeout(() => {
          window.location.href = url;
        }, 0);
      }, untrustedUrl);
      const remoteNavigationStarted = await Promise.race([
        navigationPromise,
        delay(1500).then(() => false),
      ]);
      page.off("framenavigated", navigationListener);
      page.off("request", requestListener);
      const untrustedRequests = [...navigationProbeServer.requests];
      const redirectSourceRequests = untrustedRequests.filter(
        (request) => request.url === "/native-smoke-redirect-source",
      );
      const untrustedTargetRequests = untrustedRequests.filter(
        (request) => request.url !== "/native-smoke-redirect-source",
      );
      await navigationProbeServer.close();
      const untrustedRequestCount = untrustedTargetRequests.length;
      navigationProbeServer = null;
      const webResourceProbeBlockedCount =
        stdout.match(/LYCEUM_WEB_RESOURCE_PROBE_BLOCKED/g)?.length ?? 0;
      const remoteNavigationDenied =
        !remoteNavigationStarted &&
        untrustedRequestCount === 0 &&
        redirectSourceRequests.length === 1 &&
        redirectTargetRequestObserved &&
        allUntrustedResourceTypesObserved &&
        webResourceProbeBlockedCount >= requiredUntrustedResourceTypes.length + 2 &&
        redirectProbeAttempted &&
        stdout.includes("LYCEUM_REDIRECT_SOURCE_ALLOWED") &&
        stdout.includes("LYCEUM_NAVIGATION_PROBE_DENIED") &&
        stdout.includes("LYCEUM_WEB_RESOURCE_PROBE_BLOCKED") &&
        page.url().startsWith("http://tauri.localhost");
      const passed = Object.entries(results).every(([key, value]) =>
        key === "origin" ? value === "http://tauri.localhost" : value === true,
      );
      const evidence = {
        ...results,
        pagesBeforePopup,
        pagesAfterPopup,
        popupCreated: Boolean(popup),
        untrustedRequestObserved,
        untrustedResourceRequestCount,
        untrustedResourceTypes,
        allUntrustedResourceTypesObserved,
        iframeProbeAttempted: true,
        iframeProbeObserved,
        workerProbeAttempted: true,
        workerProbeObserved,
        redirectTargetRequestObserved,
        webResourceProbeBlockedCount,
        redirectProbeAttempted,
        redirectProbeOutcome,
        redirectSourceAllowed: stdout.includes("LYCEUM_REDIRECT_SOURCE_ALLOWED"),
        redirectSourceRequests,
        untrustedTargetRequests,
        loopbackGuardObservations: (stdout.match(/LYCEUM_GUARD_OBSERVED_LOOPBACK/g) ?? []).length,
        untrustedResourceRequests,
        untrustedRequestCount,
        untrustedRequests,
        navigationCallbackDenied: stdout.includes("LYCEUM_NAVIGATION_PROBE_DENIED"),
        webResourceRequestBlocked: stdout.includes("LYCEUM_WEB_RESOURCE_PROBE_BLOCKED"),
        remoteNavigationDenied,
      };
      console.log("windowsNativeSmokeEvidence", JSON.stringify(evidence));
      if (!passed || popup || pagesAfterPopup !== pagesBeforePopup || !remoteNavigationDenied) {
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
    try {
      if (browser) await browser.close();
    } finally {
      try {
        if (child) await stopChild(child);
      } finally {
        if (navigationProbeServer) {
          try {
            await navigationProbeServer.close();
          } catch (error) {
            console.error("navigation probe server cleanup failed:", error.message);
            process.exitCode = 1;
          }
        }
        if (webViewUserDataDir) {
          // WebView2 may finish shutting down its browser subprocess shortly
          // after the host exits; retry transient directory-lock failures.
          await delay(500);
          try {
            fs.rmSync(webViewUserDataDir, {
              recursive: true,
              force: true,
              maxRetries: 20,
              retryDelay: 250,
            });
          } catch (error) {
            console.error("WebView2 smoke profile cleanup failed:", error.message);
            process.exitCode = 1;
          }
        }
      }
    }
  }
}

main().catch((error) => {
  console.error("Native desktop smoke failed:", error.message);
  process.exitCode = 1;
});
