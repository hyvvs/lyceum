import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

function packageFromResolvedEntry(entry: string, name: string) {
  let directory = dirname(entry);
  while (directory !== dirname(directory)) {
    const manifestPath = join(directory, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.name === name) return manifest as { name: string; version: string };
    }
    directory = dirname(directory);
  }
  throw new Error(`Could not locate the resolved package: ${name}`);
}

test("Workbox executes the scoped patched glob and preserves recursive static-only precache selection", async () => {
  // Resolve from the real PWA plugin to test Workbox's actual dependency
  // instance, not an unrelated glob on the root module resolution path.
  const appRequire = createRequire(resolve("apps/web/package.json"));
  const pluginRequire = createRequire(appRequire.resolve("vite-plugin-pwa"));
  const workboxEntry = pluginRequire.resolve("workbox-build");
  const workboxRequire = createRequire(workboxEntry);
  const globEntry = workboxRequire.resolve("glob");
  const minimatchEntry = createRequire(globEntry).resolve("minimatch");
  expect(packageFromResolvedEntry(workboxEntry, "workbox-build").version).toBe("7.4.1");
  expect(packageFromResolvedEntry(globEntry, "glob").version).toBe("14.0.3");
  const minimatch = packageFromResolvedEntry(minimatchEntry, "minimatch").version;
  const [major, minor, patch] = minimatch.split(".").map(Number);
  expect(major > 11 || (major === 11 && (minor > 0 || (minor === 0 && patch >= 1)))).toBe(true);

  const { getManifest } = workboxRequire("workbox-build");
  const temporaryRoot = resolve("test-results");
  mkdirSync(temporaryRoot, { recursive: true });
  const directory = mkdtempSync(join(temporaryRoot, "lyceum-precache-contract-"));
  const fixture: Record<string, string> = {
    "index.html": "<h1>Offline shell</h1>",
    "assets/entry.js": "console.log('static')",
    "nested/deep/chunk.css": ".deep { color: red }",
    "nested/deep/logo.svg": "<svg/>",
    "icons/install.png": "test-only PNG placeholder for matching",
    "manifest.webmanifest": '{"name":"Lyceum test"}',
    "assets/ignored.js.map": '{"mappings":""}',
    "private/credentials.json": '{"fixture":true}',
    "api/response.json": '{"fixture":true}',
    ".hidden.js": "not a public entry",
    "nested/.hidden.js": "not a public entry",
    "readme.md": "not an application asset",
  };
  const included = [
    "assets/entry.js",
    "icons/install.png",
    "index.html",
    "manifest.webmanifest",
    "nested/deep/chunk.css",
    "nested/deep/logo.svg",
  ];

  try {
    for (const [path, content] of Object.entries(fixture)) {
      const target = resolve(directory, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    const manifest = await getManifest({
      globDirectory: directory,
      globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
      globIgnores: ["**/*.map"],
      maximumFileSizeToCacheInBytes: 2_000_000,
    });
    expect(manifest.warnings).toEqual([]);
    expect(manifest.manifestEntries.map(({ url }: { url: string }) => url).sort()).toEqual(
      included,
    );
    for (const entry of manifest.manifestEntries) {
      expect(entry.revision).toBe(
        createHash("md5")
          .update(fixture[entry.url] ?? "")
          .digest("hex"),
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
