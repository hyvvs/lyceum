import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { RoundIconButton } from "./round-icon-button";
import { SegmentedControl } from "./segmented-control";

describe("B5a public native interactive controls", () => {
  test("RoundIconButton is a safe native named button, not a wrapped nested control", () => {
    const html = renderToStaticMarkup(
      <RoundIconButton
        aria-label="Show notifications"
        icon={<svg aria-hidden="true" />}
        id="alerts"
      />,
    );
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Show notifications"');
    expect(html).toContain('id="alerts"');
    expect(html).toContain('class="lyceum-round-icon-button"');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  test("badge supplies separate meaningful description without duplicating the button name", () => {
    const html = renderToStaticMarkup(
      <RoundIconButton
        aria-label="Notifications"
        icon={<span aria-hidden="true">!</span>}
        badge={{ text: "3", label: "3 unread notifications" }}
      />,
    );
    expect(html).toContain('aria-describedby="');
    expect(html).toContain("3 unread notifications");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("Notifications 3 unread notifications");
  });

  test("loading keeps a named target, blocks activation, while disabled uses native disabled", () => {
    const loading = renderToStaticMarkup(<RoundIconButton aria-label="Refresh" icon="↻" loading />);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-disabled="true"');
    expect(loading).not.toContain('disabled=""');
    const disabled = renderToStaticMarkup(
      <RoundIconButton aria-label="Refresh" icon="↻" disabled />,
    );
    expect(disabled).toContain('disabled=""');
  });

  const options = [
    { value: "short", label: "Short" },
    { value: "medium", label: "Medium length" },
    { value: "long", label: "Long", disabled: true },
  ] as const;

  test("SegmentedControl is a genuinely native named radio group with one selected value", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        groupLabel="Session length"
        name="duration"
        value="medium"
        options={options}
        onValueChange={() => {}}
      />,
    );
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html).toContain("Session length");
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain('value="medium"');
    expect(html).toContain('name="duration"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('role="tablist"');
  });

  test("disabled group and empty options stay semantically honest", () => {
    const disabled = renderToStaticMarkup(
      <SegmentedControl
        groupLabel="Mode"
        name="mode"
        value="short"
        options={options}
        disabled
        onValueChange={() => {}}
      />,
    );
    expect(disabled).toMatch(/<fieldset[^>]*disabled=""/);
    const empty = renderToStaticMarkup(
      <SegmentedControl
        groupLabel="No choices"
        name="none"
        value=""
        options={[]}
        onValueChange={() => {}}
      />,
    );
    expect(empty).toContain("No choices available");
    expect(empty).not.toContain('type="radio"');
  });

  test("duplicate or absent selected options fail instead of silently misrepresenting selection", () => {
    expect(() =>
      renderToStaticMarkup(
        <SegmentedControl
          groupLabel="Duplicate"
          name="duplicate"
          value="x"
          options={[
            { value: "x", label: "X" },
            { value: "x", label: "Another X" },
          ]}
          onValueChange={() => {}}
        />,
      ),
    ).toThrow(/duplicate/i);
    expect(() =>
      renderToStaticMarkup(
        <SegmentedControl
          groupLabel="No match"
          name="missing"
          value="not-an-option"
          options={options}
          onValueChange={() => {}}
        />,
      ),
    ).toThrow(/selected value/i);
  });
});
