import { ProfileManifestSchema } from "@lyceum/core";
import { describe, expect, it } from "vitest";
import { mathProfile } from "./index";

describe("mathProfile", () => {
  it("has a valid manifest", () => {
    expect(ProfileManifestSchema.safeParse(mathProfile.manifest).success).toBe(true);
  });

  it("never throws on bad input and says when it cannot verify", async () => {
    const result = await mathProfile.verify(
      { id: "i", type: "computation", prompt: "?", conceptIds: ["c"] },
      "not even math",
    );
    expect(result.status).toBe("unverifiable");
  });
});
