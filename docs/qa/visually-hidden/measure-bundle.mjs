import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));

async function buildEntry(name) {
  const result = await build({
    configFile: false,
    root,
    logLevel: "error",
    build: {
      write: false,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: false,
      lib: { entry: resolve(root, "docs/qa/visually-hidden", name), formats: ["es"] },
      rollupOptions: { external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/] },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  return outputs
    .flatMap((output) => output.output)
    .filter((output) => output.type === "chunk")
    .map((output) => output.code)
    .join("\n");
}

const [baseline, added] = await Promise.all([
  buildEntry("bundle-baseline.mjs"),
  buildEntry("bundle-with-visually-hidden.mjs"),
]);
const css = await readFile(resolve(root, "packages/ui/src/glass.css"));
console.log(
  JSON.stringify(
    {
      scope:
        "Same production-minified UI library exports, + one VisuallyHidden component; React and ReactDOM external; no CSS changes",
      baselineRawJs: Buffer.byteLength(baseline),
      addedRawJs: Buffer.byteLength(added),
      incrementalRawJs: Buffer.byteLength(added) - Buffer.byteLength(baseline),
      baselineGzipJs: gzipSync(baseline).byteLength,
      addedGzipJs: gzipSync(added).byteLength,
      incrementalGzipJs: gzipSync(added).byteLength - gzipSync(baseline).byteLength,
      unchangedCssBytes: css.byteLength,
      incrementalCssBytes: 0,
      limitation:
        "Not a measured M0-004 route; UI package dependencies already included Radix VisuallyHidden transitively.",
    },
    null,
    2,
  ),
);
