import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));
// Anchor this comparison at the branch's actual fork point. This remains
// accurate after subsequent Toast fixes without embedding an opaque hash in
// source or accidentally comparing CSS against a newer moving main.
const baselineMain = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const entries = ["bundle-baseline.mjs", "bundle-with-toast.mjs"];

async function buildEntry(entry) {
  const result = await build({
    configFile: false,
    root,
    logLevel: "error",
    build: {
      write: false,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: false,
      lib: { entry: resolve(root, "docs/qa/toast", entry), formats: ["es"] },
      rollupOptions: {
        external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/],
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const js = outputs.flatMap((out) => out.output).filter((out) => out.type === "chunk");
  return js.map((out) => out.code).join("\n");
}

const [baseline, withToast] = await Promise.all(entries.map(buildEntry));
const cssBefore = execFileSync("git", ["show", `${baselineMain}:packages/ui/src/glass.css`], {
  cwd: root,
});
const cssAfter = await readFile(resolve(root, "packages/ui/src/glass.css"));
const summary = {
  scope:
    "production-minified UI library JS; identical existing primitives + seven Toast exports; React/ReactDOM external in both",
  baselineMain,
  baselineJsBytes: Buffer.byteLength(baseline),
  withToastJsBytes: Buffer.byteLength(withToast),
  incrementalJsBytes: Buffer.byteLength(withToast) - Buffer.byteLength(baseline),
  baselineJsGzipBytes: gzipSync(baseline).byteLength,
  withToastJsGzipBytes: gzipSync(withToast).byteLength,
  incrementalJsGzipBytes: gzipSync(withToast).byteLength - gzipSync(baseline).byteLength,
  cssBaselineBytes: cssBefore.byteLength,
  cssAfterBytes: cssAfter.byteLength,
  incrementalCssBytes: cssAfter.byteLength - cssBefore.byteLength,
  cssBaselineGzipBytes: gzipSync(cssBefore).byteLength,
  cssAfterGzipBytes: gzipSync(cssAfter).byteLength,
  incrementalCssGzipBytes: gzipSync(cssAfter).byteLength - gzipSync(cssBefore).byteLength,
  limitation:
    "There is no M0-004 web app/route yet; this controlled comparative production library build is not an actual initial-route 250 KB measurement.",
};
console.log(JSON.stringify(summary, null, 2));
