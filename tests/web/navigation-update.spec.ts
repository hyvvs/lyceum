import { spawn } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("genuinely waiting service-worker update reserves space and activates only on consent", async ({
  page,
  request,
}) => {
  test.slow();
  const folder = resolve("test-results");
  mkdirSync(folder, { recursive: true });
  const isolated = mkdtempSync(join(folder, "b2-update-"));
  const origin = "http://127.0.0.1:4181";
  cpSync(resolve("apps/web/dist"), isolated, { recursive: true });
  const server = spawn(
    process.execPath,
    [
      resolve("node_modules/vite/bin/vite.js"),
      "preview",
      "--outDir",
      isolated,
      "--host",
      "127.0.0.1",
      "--port",
      "4181",
      "--strictPort",
    ],
    { cwd: process.cwd(), windowsHide: true, stdio: "ignore" },
  );
  try {
    await expect
      .poll(async () => {
        try {
          return (await request.get(origin)).status();
        } catch {
          return 0;
        }
      })
      .toBe(200);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(origin);
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(() => {
      Object.assign(window, {
        b2UnsavedMarker: "still waiting for my consent",
        b2ControllerIdentity: navigator.serviceWorker.controller,
      });
    });
    appendFileSync(join(isolated, "sw.js"), "\n// B2 test-only actual waiting version B.\n");
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Real service-worker registration required");
      await registration.update();
    });
    const consent = page.getByRole("button", { name: "Update when ready" });
    await expect(consent).toBeVisible({ timeout: 10_000 });
    expect(
      await page.evaluate(() => (window as Window & { b2UnsavedMarker?: string }).b2UnsavedMarker),
    ).toBe("still waiting for my consent");

    // B3 focused owner audit: the actual waiting update prompt is an operable
    // auxiliary control, not just a banner rectangle. At enlarged root text,
    // the Tooltip must not float over its action or the other Dock link.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    for (const name of ["Today", "Settings"]) {
      const link = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", {
        name,
      });
      // Real update prompt may force in-flow navigation at 32px. Scroll
      // the link into view before verifying an already settled Tooltip, so
      // ancestor-scroll dismissal cannot masquerade as a blank screenshot.
      await link.scrollIntoViewIfNeeded();
      await link.hover();
      const visibleTooltip = page.locator(".lyceum-tooltip[role='tooltip']");
      await expect(visibleTooltip).toHaveText(name);
      await expect(visibleTooltip).toBeVisible();
      // Radix may mount the portal during its 120ms fade from opacity zero.
      // Never count or capture an invisible frame as a visible clearance proof.
      await expect(visibleTooltip).toHaveCSS("opacity", "1");
      const collision = await page.evaluate(() => {
        const hint = document.querySelector<HTMLElement>(".lyceum-tooltip[role='tooltip']");
        const prompt = document.querySelector<HTMLElement>(".update-banner");
        const button = prompt?.querySelector<HTMLButtonElement>("button");
        const links = Array.from(document.querySelectorAll<HTMLElement>(".icon-dock a[href]"));
        if (!hint || !prompt || !button || links.length !== 2)
          throw new Error("Real waiting update/Tooltip/Dock missing");
        const tip = hint.getBoundingClientRect();
        const intersect = (a: DOMRect, b: DOMRect) =>
          Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.5 &&
          Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.5;
        return {
          hint: tip.toJSON(),
          prompt: prompt.getBoundingClientRect().toJSON(),
          mode: document.querySelector(".application")?.getAttribute("data-navigation-mode"),
          promptMasked: intersect(tip, prompt.getBoundingClientRect()),
          buttonMasked: intersect(tip, button.getBoundingClientRect()),
          linksMasked: links.filter((item) => intersect(tip, item.getBoundingClientRect())).length,
          withinViewport:
            tip.left >= -1 &&
            tip.right <= innerWidth + 1 &&
            tip.top >= -1 &&
            tip.bottom <= innerHeight + 1,
        };
      });
      if (process.env.LYCEUM_B3_AUDIT_CAPTURE === "1") {
        await page.screenshot({
          path: `docs/qa/m0-017-stage-b3/audit-pwa-waiting-32px-tooltip-${name.toLowerCase()}.png`,
          animations: "disabled",
        });
      }
      expect(collision.withinViewport, JSON.stringify(collision)).toBe(true);
      expect(collision.promptMasked, JSON.stringify(collision)).toBe(false);
      expect(collision.buttonMasked, JSON.stringify(collision)).toBe(false);
      expect(collision.linksMasked, JSON.stringify(collision)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(page.locator(".lyceum-tooltip[role='tooltip']")).not.toBeVisible();
    }

    // Width-aware B3 placement with a genuinely waiting A-to-B update. Change
    // languages through the real Settings UI and exercise both directions at
    // the Linux-failing 16px scale and at an intermediate 20px scale. The
    // consent button must remain accessible throughout (no auto-activation).
    let activeLocale: "en" | "es" = "en";
    for (const scenario of [
      { width: 320, height: 640, root: 16 },
      { width: 320, height: 844, root: 20 },
    ]) {
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      for (const locale of ["en", "es"] as const) {
        const previous =
          activeLocale === "en"
            ? { nav: "Quick navigation", settings: "Settings" }
            : { nav: "Navegación rápida", settings: "Ajustes" };
        // Real client-side links (NOT page.goto): the original unsaved-work
        // marker and controlling SW must survive the entire waiting period.
        await page
          .getByRole("navigation", { name: previous.nav })
          .getByRole("link", { name: previous.settings })
          .click();
        await page.locator("#language").selectOption(locale);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const next =
          locale === "en"
            ? { nav: "Quick navigation", today: "Today" }
            : { nav: "Navegación rápida", today: "Hoy" };
        await page
          .getByRole("navigation", { name: next.nav })
          .getByRole("link", { name: next.today })
          .click();
        activeLocale = locale;
        for (const direction of ["ltr", "rtl"] as const) {
          await page.evaluate(
            ({ dir, root }) => {
              document.documentElement.dir = dir;
              document.documentElement.style.fontSize = `${root}px`;
            },
            { dir: direction, root: scenario.root },
          );
          await expect(page.locator(".application")).toHaveAttribute(
            "data-navigation-mode",
            "reserved",
          );
          const realPrompt = page.locator(".update-banner");
          await expect(realPrompt.getByRole("button")).toBeVisible();
          const names =
            locale === "en"
              ? { nav: "Quick navigation", links: ["Today", "Settings"] }
              : { nav: "Navegación rápida", links: ["Hoy", "Ajustes"] };
          const nav = page.getByRole("navigation", { name: names.nav });
          for (const name of names.links) {
            const link = nav.getByRole("link", { name });
            await link.scrollIntoViewIfNeeded();
            // After client-side route/label changes the pointer can still sit
            // over a trigger while Radix has just dismissed its old Tooltip.
            // Require a genuine new pointer entry, not a synthetic focus.
            await page.mouse.move(2, 2, { steps: 5 });
            await link.hover();
            const tooltip = page.locator(".lyceum-tooltip[role='tooltip']");
            await expect(tooltip).toHaveText(name);
            await expect(tooltip).toBeVisible();
            await expect(tooltip).toHaveCSS("opacity", "1");
            const measured = await page.evaluate(() => {
              const hint = document.querySelector<HTMLElement>(".lyceum-tooltip[role='tooltip']");
              const banner = document.querySelector<HTMLElement>(".update-banner");
              const button = banner?.querySelector<HTMLButtonElement>("button");
              const frame = document.querySelector<HTMLElement>(".application-frame");
              const links = Array.from(
                document.querySelectorAll<HTMLAnchorElement>(".icon-dock a[href]"),
              );
              if (!hint || !banner || !button || !frame || links.length !== 2)
                throw new Error("Actual waiting update/Tooltip/reading/Dock missing");
              const rect = hint.getBoundingClientRect();
              const intersects = (other: DOMRect) =>
                Math.min(rect.right, other.right) > Math.max(rect.left, other.left) + 0.5 &&
                Math.min(rect.bottom, other.bottom) > Math.max(rect.top, other.top) + 0.5;
              return {
                tooltip: rect.toJSON(),
                banner: banner.getBoundingClientRect().toJSON(),
                frame: frame.getBoundingClientRect().toJSON(),
                side: hint.getAttribute("data-side"),
                mode: document
                  .querySelector(".shell-auxiliary")
                  ?.getAttribute("data-tooltip-placement"),
                trigger: links
                  .find((link) => link.getAttribute("aria-label") === hint.textContent?.trim())
                  ?.getBoundingClientRect()
                  .toJSON(),
                bannerMasked: intersects(banner.getBoundingClientRect()),
                consentMasked: intersects(button.getBoundingClientRect()),
                frameMasked: intersects(frame.getBoundingClientRect()),
                maskedLinks: links
                  .filter((link) => intersects(link.getBoundingClientRect()))
                  .map((link) => link.getAttribute("aria-label")),
                withinViewport:
                  rect.left >= -1 &&
                  rect.right <= innerWidth + 1 &&
                  rect.top >= -1 &&
                  rect.bottom <= innerHeight + 1,
                readable:
                  hint.scrollWidth <= hint.clientWidth + 1 &&
                  hint.scrollHeight <= hint.clientHeight + 1,
              };
            });
            const evidence = `${scenario.width}x${scenario.height}/${scenario.root} ${locale} ${direction} ${name}: ${JSON.stringify(measured)}`;
            if (process.env.LYCEUM_B3_GEOMETRY === "1")
              console.log(`B3_PWA_WIDTH_GEOMETRY ${evidence}`);
            expect(["top", "outward"], evidence).toContain(measured.mode);
            if (measured.mode === "top") {
              expect(measured.side, evidence).toBe("top");
            } else {
              // Smaller translated labels may genuinely fit laterally. Accept
              // this only if collision resolution preserves their outward side.
              const outwardRight = (names.links.indexOf(name) === 0) === (direction === "rtl");
              expect(measured.side, evidence).toBe(outwardRight ? "right" : "left");
            }
            expect(measured.withinViewport, evidence).toBe(true);
            expect(measured.readable, evidence).toBe(true);
            expect(measured.bannerMasked, evidence).toBe(false);
            expect(measured.consentMasked, evidence).toBe(false);
            expect(measured.frameMasked, evidence).toBe(false);
            expect(measured.maskedLinks, evidence).toEqual([]);
            if (process.env.LYCEUM_B3_WIDTH_CAPTURE === "1") {
              await page.screenshot({
                path: `docs/qa/m0-017-stage-b3/audit-width-pwa-${scenario.width}x${scenario.height}-${scenario.root}px-${locale}-${direction}-${name.toLowerCase()}.png`,
                animations: "disabled",
              });
            }
            await page.keyboard.press("Escape");
            await expect(tooltip).not.toBeVisible();
          }
        }
      }
    }
    // Restore the original waiting-update consent and short-viewport B2
    // assertions under the originally tested English/390px/16px setup.
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("navigation", { name: "Navegación rápida" })
      .getByRole("link", { name: "Ajustes" })
      .click();
    await page.locator("#language").selectOption("en");
    await page
      .getByRole("navigation", { name: "Quick navigation" })
      .getByRole("link", { name: "Today" })
      .click();
    expect(
      await page.evaluate(() => (window as Window & { b2UnsavedMarker?: string }).b2UnsavedMarker),
    ).toBe("still waiting for my consent");
    await page.evaluate(() => {
      document.documentElement.dir = "ltr";
      document.documentElement.style.fontSize = "16px";
    });
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "reserved");

    const rectangles = await page.evaluate(() => {
      const frame = document.querySelector(".application-frame")?.getBoundingClientRect();
      const nav = document.querySelector(".icon-dock")?.getBoundingClientRect();
      const prompt = document.querySelector(".update-banner")?.getBoundingClientRect();
      if (!frame || !nav || !prompt) throw new Error("Actual update shell geometry missing");
      return {
        frameBottom: frame.bottom,
        promptTop: prompt.top,
        promptBottom: prompt.bottom,
        navTop: nav.top,
        navBottom: nav.bottom,
      };
    });
    expect(rectangles.frameBottom).toBeLessThanOrEqual(rectangles.promptTop);
    expect(rectangles.promptBottom).toBeLessThanOrEqual(rectangles.navTop);
    expect(rectangles.navBottom).toBeLessThanOrEqual(844);
    if (process.env.LYCEUM_B2_CAPTURE === "1") {
      await page.screenshot({ path: "docs/qa/m0-017-stage-b2/pwa-waiting-reserved.png" });
    }

    await page.setViewportSize({ width: 320, height: 256 });
    await expect(page.locator(".application")).toHaveAttribute("data-navigation-mode", "flow");
    await expect(page.locator(".update-banner")).toHaveCSS("position", "relative");
    await consent.scrollIntoViewIfNeeded();
    await expect(consent).toBeInViewport();
    if (process.env.LYCEUM_B2_CAPTURE === "1") {
      await page.screenshot({ path: "docs/qa/m0-017-stage-b2/pwa-waiting-in-flow.png" });
    }
    const beforeConsent = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        waiting: !!registration?.waiting,
        sameController:
          navigator.serviceWorker.controller ===
          (window as Window & { b2ControllerIdentity?: ServiceWorker }).b2ControllerIdentity,
        marker: (window as Window & { b2UnsavedMarker?: string }).b2UnsavedMarker,
      };
    });
    expect(beforeConsent, JSON.stringify(beforeConsent)).toEqual({
      waiting: true,
      sameController: true,
      marker: "still waiting for my consent",
    });
    await Promise.all([page.waitForEvent("load"), consent.click()]);
    await expect(page.getByRole("heading", { name: "A clear place to begin." })).toBeVisible();
    expect(
      await page.evaluate(() => (window as Window & { b2UnsavedMarker?: string }).b2UnsavedMarker),
    ).toBeUndefined();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    });
  } finally {
    server.kill();
    if (isolated.startsWith(join(folder, "b2-update-"))) {
      rmSync(isolated, { recursive: true, force: true });
    }
  }
});
