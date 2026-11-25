import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Dock } from "./dock";
import { PillNav } from "./pill-nav";
import { VisuallyHidden } from "./visually-hidden";

describe("public semantic navigation primitives", () => {
  test("PillNav renders one named native nav with consumer links and native attributes", () => {
    const html = renderToStaticMarkup(
      <PillNav aria-label="Primary studies" id="study-nav" data-source="consumer" dir="rtl">
        <a href="/" aria-current="page">
          Today
        </a>
        <a href="/settings">Settings</a>
      </PillNav>,
    );
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Primary studies"');
    expect(html).toContain('id="study-nav"');
    expect(html).toContain('data-source="consumer"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain("<button");
    expect(html.match(/<nav\b/g)).toHaveLength(1);
  });

  test("Dock forwards native attributes, named landmarks and consumer-owned current states", () => {
    const html = renderToStaticMarkup(
      <Dock aria-labelledby="quick-nav-label" orientation="horizontal" title="Route shortcuts">
        <span id="quick-nav-label">Quick navigation</span>
        <a href="/" aria-label="Today" aria-current="page">
          <span aria-hidden="true">⌂</span>
          <VisuallyHidden>Today</VisuallyHidden>
        </a>
        <a href="/settings" aria-label="Settings">
          <span aria-hidden="true">⚙</span>
          <VisuallyHidden>Settings</VisuallyHidden>
        </a>
      </Dock>,
    );
    expect(html).toContain('aria-labelledby="quick-nav-label"');
    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('title="Route shortcuts"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('aria-current="page"');
    expect(html.match(/<a\b/g)).toHaveLength(2);
    expect(html).not.toContain("<button");
  });

  test("empty, single and vertical navigation remain legitimate consumer composition", () => {
    expect(renderToStaticMarkup(<PillNav aria-label="Empty navigation" />)).toContain("</nav>");
    const dock = renderToStaticMarkup(
      <Dock orientation="vertical" aria-label="One destination">
        <a href="/" aria-label="Only available destination">
          <span aria-hidden="true">⌂</span>
          <VisuallyHidden>Only available destination</VisuallyHidden>
        </a>
      </Dock>,
    );
    expect(dock).toContain('data-orientation="vertical"');
    expect(dock.match(/<a\b/g)).toHaveLength(1);
    expect(dock).not.toContain('aria-current="page"');
  });
});
