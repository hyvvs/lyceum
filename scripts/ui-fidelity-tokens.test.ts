import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const tokens = readFileSync("packages/ui/src/glass.css", "utf8");
const todaySkin = readFileSync("tests/fixtures/m0-005-fidelity-today.css", "utf8");

function tokenValue(name: string): string {
  const re = new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m");
  const value = re.exec(tokens)?.[1]?.trim();
  if (!value) throw new Error(`Missing shared fidelity token ${name}`);
  return value;
}

function luminance(hex: string): number {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error("Expected six-digit RGB hexadecimal");
  const linear = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function ratio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("M0 shared fidelity material contract", () => {
  test("stores tuned Today blur, brightness, scrim, fill, rim and optical material centrally", () => {
    expect(tokenValue("--fidelity-backdrop-preblur")).toBe("8px");
    expect(tokenValue("--fidelity-backdrop-brightness")).toBe("1");
    expect(tokenValue("--fidelity-backdrop-scrim")).toBe("rgb(8 10 16 / 0.58)");
    expect(tokenValue("--fidelity-glass-fill")).toBe("rgb(255 255 255 / 0.07)");
    expect(tokenValue("--fidelity-glass-blur")).toBe("24px");
    expect(tokenValue("--fidelity-glass-rim")).toBe("rgb(255 255 255 / 0.14)");
    expect(tokenValue("--fidelity-glass-saturate")).toBe("140%");
    expect(tokenValue("--glass-fill")).toBe("var(--fidelity-glass-fill)");
    expect(tokenValue("--glass-blur")).toBe("var(--fidelity-glass-blur)");
  });

  test("deeper blue and white buttons retain 4.5:1 or better text contrast", () => {
    const blue = tokenValue("--fidelity-button-blue");
    const white = tokenValue("--fidelity-button-label");
    expect(ratio(white, blue)).toBeGreaterThanOrEqual(4.5);
    expect(tokenValue("--text-on-accent")).toBe("var(--fidelity-button-label)");
  });

  test("light-theme semantic text colors pass AA on the pale solid surface", () => {
    const light = /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/.exec(tokens)?.[1];
    if (!light) throw new Error("Explicit light theme token block missing");
    const getLight = (token: string) => {
      const value = new RegExp(`^\\s*${token}:\\s*(#[\\da-f]{6});`, "im").exec(light)?.[1];
      if (!value) throw new Error(`Missing six-digit light semantic token ${token}`);
      return value;
    };
    const background = getLight("--surface-solid");
    for (const semantic of ["--positive", "--caution", "--danger", "--conceptual"]) {
      expect(ratio(getLight(semantic), background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the QA painting stays outside production-imported shared CSS", () => {
    expect(todaySkin).toContain("var(--fidelity-backdrop-position)");
    expect(todaySkin).toContain("var(--fidelity-backdrop-brightness)");
    expect(todaySkin).toContain("var(--fidelity-glass-saturate)");
    expect(todaySkin).toContain("cole-course-of-empire-preblur.webp");
    expect(tokens).not.toContain("cole-course-of-empire-preblur.webp");
    expect(tokens).not.toContain("docs/design-reference/reference-home.png");
  });
});
