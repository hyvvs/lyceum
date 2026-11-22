import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("agent file validation", () => {
  it("works with the repository's native filesystem paths", () => {
    const result = spawnSync(process.execPath, ["scripts/check-agent-files.mjs"], {
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Agent files OK");
  });
});
