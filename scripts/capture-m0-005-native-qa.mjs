/**
 * QA-ONLY Windows Tauri WebView2 renderer recording.
 *
 * A DIFFERENT native-smoke executable and renderer are compiled into .git,
 * never apps/web/dist or the normal release build. Captures ONLY the trusted
 * renderer's CDP screencast (not a user's OS desktop, windows or notifications).
 * The output is non-synthetic full-wall-time native motion; the source frame
 * delivery rate and encoded container rate are separately documented.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

if (process.platform !== "win32") throw new Error("QA-only Windows WebView2 required");

const root = resolve(import.meta.dirname, "..");
const executable = resolve(
  root,
  ".git",
  "m0-005-visual-native",
  "target",
  "release",
  "lyceum-desktop.exe",
);
const captures = resolve(root, "docs", "qa", "m0-005-visual-prototype", "captures");
const videoFile = resolve(captures, "prototype-full-speed-native-qa.mp4");

async function assertNativeBundleFresh() {
  // Require QA-only binary and renderer rebuilt after each source revision.
  const compiledTime = (await stat(executable)).mtimeMs;
  const bundledTime = (
    await stat(resolve(root, ".git", "m0-005-visual-native", "dist", "index.html"))
  ).mtimeMs;
  for (const source of [
    "tests/fixtures/m0-005-reference-prototype.stories.tsx",
    "tests/fixtures/m0-005-reference-prototype.css",
    "tests/fixtures/assets/sunlit-room-licensed-pexels-27051764.jpg",
    "tests/fixtures/native-visual-qa/main.tsx",
    "tests/fixtures/native-visual-qa/index.html",
    "packages/ui/src/morphing-rail.tsx",
    "packages/ui/src/morphing-rail.css",
    "apps/web/vite.visual-qa.config.ts",
    "scripts/build-m0-005-native-qa.mjs",
  ]) {
    if ((await stat(resolve(root, source))).mtimeMs > bundledTime) {
      throw new Error(`QA renderer is stale for ${source}; rebuild native QA Tauri`);
    }
  }
  if (compiledTime < bundledTime) {
    throw new Error("Native QA binary predates its renderer bundle; rebuild QA Tauri");
  }
  return createHash("sha256")
    .update(await readFile(executable))
    .digest("hex");
}

async function reservePort() {
  const portServer = createServer();
  await new Promise((ok, fail) => {
    portServer.once("error", fail);
    portServer.listen(0, "127.0.0.1", ok);
  });
  const info = portServer.address();
  if (!info || typeof info === "string") throw new Error("CDP ephemeral port unavailable");
  await new Promise((ok, fail) => portServer.close((error) => (error ? fail(error) : ok())));
  return info.port;
}

async function waitUntil(predicate, label, processHandle, timeoutMs = 35_000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (processHandle.exitCode !== null)
      throw new Error(`${label}: native process exited ${processHandle.exitCode}`);
    if (await predicate()) return;
    await delay(120);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([delay(3000), new Promise((ok) => child.once("exit", ok))]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function encodeScreencast(frames, privateDir) {
  if (frames.length < 20) throw new Error(`Too few real native WebView frames: ${frames.length}`);
  const hashes = new Set(
    frames.map((frame) => createHash("sha256").update(frame.data).digest("hex")),
  );
  if (hashes.size < 6) throw new Error(`Insufficient distinct renderer frames: ${hashes.size}`);
  const elapsed = (frames.at(-1).at - frames[0].at) / 1000;
  if (elapsed < 4 || elapsed > 30)
    throw new Error(`Unexpected native recording wall time ${elapsed}s`);
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const filename = `frame_${String(i).padStart(5, "0")}.jpg`;
    await writeFile(join(privateDir, filename), frames[i].data, { flag: "wx" });
    lines.push(`file '${filename}'`);
    // Time is recorded from actual delivery of native WebView2 frames, not a
    // simulated animation clock or mocked timestamps.
    const next = frames[i + 1]?.at ?? frames[i].at + 40;
    lines.push(`duration ${Math.max(0.008, (next - frames[i].at) / 1000).toFixed(5)}`);
  }
  lines.push(`file 'frame_${String(frames.length - 1).padStart(5, "0")}.jpg'`);
  await writeFile(join(privateDir, "frames.ffconcat"), `${lines.join("\n")}\n`, { flag: "wx" });
  const encoding = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-safe",
      "0",
      "-f",
      "concat",
      "-i",
      "frames.ffconcat",
      "-fps_mode",
      "cfr",
      "-r",
      "25",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      videoFile,
    ],
    { cwd: privateDir, windowsHide: true, encoding: "utf8", maxBuffer: 3_000_000 },
  );
  if (encoding.error || encoding.status !== 0)
    throw new Error(`Renderer screencast conversion failed: ${encoding.error ?? encoding.stderr}`);
  await writeFile(
    resolve(captures, "native-screencast-metadata.json"),
    `${JSON.stringify(
      {
        kind: "Actual QA-only Windows Tauri v2 WebView2 CDP Page.screencastFrame renderer",
        sourceFrameCount: frames.length,
        distinctSourceFrameCount: hashes.size,
        observedSourceSpanSeconds: Number(elapsed.toFixed(3)),
        encodedFramesPerSecond: 25,
        containsOperatingSystemDesktop: false,
        originalOwnerV5V10ReferenceFidelityVerified: false,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `NATIVE_RENDERER_CAPTURE_OK frames=${frames.length} distinct=${hashes.size} observed_wall_s=${elapsed.toFixed(3)} encoded_fps=25`,
  );
}

await mkdir(captures, { recursive: true });
const nativeBinarySha256 = await assertNativeBundleFresh();
const port = await reservePort();
const privateProfile = await mkdtemp(join(tmpdir(), "lyceum-qa-webview2-"));
const privateFrames = await mkdtemp(
  resolve(root, ".git", "m0-005-visual-native", "webview2-frames-"),
);
const native = spawn(executable, [], {
  cwd: root,
  windowsHide: true,
  env: {
    ...process.env,
    LYCEUM_DESKTOP_IPC_SMOKE: "1",
    LYCEUM_WEBVIEW2_USER_DATA_DIR: privateProfile,
    LYCEUM_WEBVIEW2_CDP_PORT: String(port),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let nativeOutput = "";
for (const stream of [native.stdout, native.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    nativeOutput += chunk;
  });
}
let browser;
let session;
let screencastStarted = false;
try {
  await waitUntil(
    () => nativeOutput.includes("LYCEUM_WEBVIEW_REQUEST_GUARD_READY"),
    "native WebView2 request guard marker",
    native,
  );
  await waitUntil(
    async () => {
      try {
        return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
      } catch {
        return false;
      }
    },
    "isolated native-only CDP endpoint",
    native,
  );
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  await waitUntil(
    () =>
      browser
        .contexts()
        .flatMap((context) => context.pages())
        .some((page) => page.url().startsWith("http://tauri.localhost")),
    "trusted bundled native window",
    native,
  );
  const page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((entry) => entry.url().startsWith("http://tauri.localhost"));
  if (!page) throw new Error("Native trusted renderer not found");
  const laterRequests = [];
  page.on("request", (request) => laterRequests.push(request.url()));
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
  await page.getByText("EMPTY STATE · NO LEARNER DATA").waitFor();
  // Retrospective same-origin performance resource inventory is only an
  // additional sanity check, NOT an exhaustive startup egress test.
  const existingResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  for (const uri of existingResources) {
    if (!uri.startsWith("http://tauri.localhost") && !uri.startsWith("http://ipc.localhost"))
      throw new Error("Unexpected native fixture PerformanceResourceTiming resource outside app");
  }
  await delay(900);
  await page.screenshot({ path: resolve(captures, "15-native-webview-empty.png") });
  session = await page.context().newCDPSession(page);
  await session.send("Page.enable");
  const frames = [];
  const frameErrors = [];
  let stillRecording = true;
  session.on("Page.screencastFrame", (frame) => {
    // CDP represents only pixels from THIS trusted Tauri WebView target,
    // preventing accidental recording of adjacent windows, OS notifications,
    // other desktop accounts or apps.
    if (stillRecording) {
      frames.push({ at: performance.now(), data: Buffer.from(frame.data, "base64") });
    }
    void session
      .send("Page.screencastFrameAck", { sessionId: frame.sessionId })
      .catch((error) => frameErrors.push(String(error)));
  });
  await session.send("Page.startScreencast", {
    format: "jpeg",
    quality: 84,
    maxWidth: 1600,
    maxHeight: 1000,
    everyNthFrame: 1,
  });
  screencastStarted = true;
  await delay(300);
  await page.getByRole("button", { name: "Expand navigation" }).click();
  await delay(630);
  await page.screenshot({ path: resolve(captures, "16-native-webview-expanded.png") });
  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await delay(620);
  await page.getByRole("button", { name: "Synthetic", exact: true }).click();
  await delay(520);
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await delay(720);
  await page.screenshot({ path: resolve(captures, "17-native-webview-reading.png") });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await delay(650);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await delay(670);
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await delay(610);
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await delay(500);
  await session.send("Page.stopScreencast");
  screencastStarted = false;
  stillRecording = false;
  // Only track the captured renderer. If the API dropped a frame during exit
  // its ack may fail; that is a CDP shutdown detail, not hidden network proof.
  if (frameErrors.length > 20)
    throw new Error(`Excessive native CDP screencast ack errors: ${frameErrors.length}`);
  for (const uri of laterRequests) {
    if (!uri.startsWith("http://tauri.localhost") && !uri.startsWith("http://ipc.localhost"))
      throw new Error("Unexpected later native renderer network request");
  }
  await encodeScreencast(frames, privateFrames);
  // Keep the full executable fingerprint in local ignored QA provenance, not a
  // published high-entropy metadata literal that the fail-closed secrets scan
  // correctly inspects. No scanner exclusion or global policy weakening.
  await writeFile(
    resolve(root, ".git", "m0-005-visual-native", "last-captured-executable-sha256.txt"),
    `${nativeBinarySha256}\n`,
  );
  console.log(
    "PASS actual Windows native WebView2 app, local-only renderer inspection, guarded native entry, three native WebView2 screenshots",
  );
} finally {
  if (screencastStarted) {
    try {
      await session?.send("Page.stopScreencast");
    } catch {
      // Best effort after failed capture.
    }
  }
  await browser?.close();
  await stopProcess(native);
  await rm(privateFrames, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
  try {
    await rm(privateProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
  } catch {
    console.warn("QA-only temporary WebView2 profile is still locked; no user data was used");
  }
}
