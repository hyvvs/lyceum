import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { BarChart } from "./bar-chart";
import { MasteryRing } from "./mastery-ring";
import { StatCard } from "./stat-card";

describe("B5b pure, truthful presentation of consumer-supplied data", () => {
  test("StatCard contains native named article, value, icon chip, honest delta and trend description", () => {
    const html = renderToStaticMarkup(
      <StatCard
        label="Practice attempts"
        value={0}
        icon={<span aria-hidden="true">∑</span>}
        delta={{ direction: "decrease", text: "2 fewer", context: "versus prior period" }}
        trend={{ samples: [5, 3, 0], description: "Attempts declined across three periods" }}
      />,
    );
    expect(html).toContain("<article");
    expect(html).toContain("Practice attempts");
    expect(html).toContain(">0<");
    expect(html).toContain("2 fewer");
    expect(html).toContain("versus prior period");
    expect(html).toContain("Attempts declined across three periods");
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("aria-valuenow");
  });

  test("StatCard never substitutes zero or a fake sparkline for absent data", () => {
    const html = renderToStaticMarkup(<StatCard label="Due reviews" value={null} />);
    expect(html).toContain("Not available");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain(">0<");
    const negative = renderToStaticMarkup(
      <StatCard
        label="Net change"
        value={-20}
        delta={{ direction: "increase", text: "Increased by 5", context: "versus baseline" }}
      />,
    );
    expect(negative).toContain("-20");
    expect(negative).toContain("Increased by 5");
    expect(negative).not.toContain("improved");
  });

  test("StatCard rejects untruthful or insufficient trend and delta inputs", () => {
    expect(() => renderToStaticMarkup(<StatCard label="Invalid" value={Number.NaN} />)).toThrow(
      /finite/i,
    );
    expect(() =>
      renderToStaticMarkup(
        <StatCard label="Invalid trend" value="8" trend={{ samples: [8], description: "Trend" }} />,
      ),
    ).toThrow(/at least two/i);
    expect(() =>
      renderToStaticMarkup(
        <StatCard
          label="Invalid trend"
          value="8"
          trend={{ samples: [8, Number.POSITIVE_INFINITY], description: "Trend" }}
        />,
      ),
    ).toThrow(/finite/i);
    expect(() =>
      renderToStaticMarkup(
        <StatCard
          label="Invalid delta"
          value="8"
          delta={{ direction: "decrease", text: "", context: "" }}
        />,
      ),
    ).toThrow(/delta/i);
  });

  test("StatCard keeps finite SVG coordinates with both largest-magnitude finite extrema", () => {
    const html = renderToStaticMarkup(
      <StatCard
        label="Extreme sample range"
        value="Extrema"
        trend={{
          samples: [-Number.MAX_VALUE, 0, Number.MAX_VALUE],
          description: "Three extreme but finite illustrative samples",
        }}
      />,
    );
    const points = html.match(/<polyline points="([^"]+)"/)?.[1] ?? "";
    expect(points).not.toBe("");
    expect(points).not.toMatch(/NaN|Infinity/);
    expect(points.split(" ")).toHaveLength(3);
  });

  test("StatCard does not throw from argument-spread limits when supplied a large finite trend", () => {
    const samples = Array.from({ length: 150_000 }, (_, index) => index % 2);
    const html = renderToStaticMarkup(
      <StatCard
        label="Large synthetic trend"
        value={1}
        trend={{ samples, description: "Long finite input" }}
      />,
    );
    expect(html).toContain("Long finite input");
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  test("BarChart labels every finite value in the textual equivalent, units and exclusive highlight", () => {
    const html = renderToStaticMarkup(
      <BarChart
        title="Weekly practice"
        units="attempts"
        scaleMax={20}
        data={[
          { id: "m", label: "Monday", value: 0 },
          { id: "t", label: "Tuesday", value: 12 },
          { id: "w", label: "Wednesday", value: 12 },
        ]}
        highlightedId="t"
      />,
    );
    expect(html).toContain("<figure");
    expect(html).toContain("<figcaption");
    expect(html).toContain("Weekly practice");
    expect(html).toContain("Monday");
    expect(html).toContain("0 attempts");
    expect(html).toContain("12 attempts");
    expect(html.match(/data-highlighted="true"/g)).toHaveLength(1);
    expect(html).toContain("Highlighted");
    expect(html).not.toContain("tabindex");
  });

  test("BarChart displays empty data plainly, rejects invalid signed/nonfinite values, scales and ids", () => {
    const empty = renderToStaticMarkup(
      <BarChart title="No trend" units="items" scaleMax={10} data={[]} />,
    );
    expect(empty).toContain("No data available");
    const baseline = { title: "Chart", units: "items", scaleMax: 10 };
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, 11]) {
      expect(() =>
        renderToStaticMarkup(
          <BarChart {...baseline} data={[{ id: "one", label: "One", value }]} />,
        ),
      ).toThrow();
    }
    expect(() => renderToStaticMarkup(<BarChart {...baseline} scaleMax={0} data={[]} />)).toThrow(
      /scale/i,
    );
    expect(() =>
      renderToStaticMarkup(
        <BarChart
          {...baseline}
          data={[{ id: "one", label: "One", value: 1 }]}
          highlightedId="missing"
        />,
      ),
    ).toThrow(/highlight/i);
    expect(() =>
      renderToStaticMarkup(
        <BarChart
          {...baseline}
          data={[
            { id: "duplicate", label: "One", value: 1 },
            { id: "duplicate", label: "Two", value: 2 },
          ]}
        />,
      ),
    ).toThrow(/duplicate/i);
  });

  test("MasteryRing distinguishes explicit probability with uncertainty from unknown and zero", () => {
    const assessed = renderToStaticMarkup(
      <MasteryRing label="Concept estimate" estimate={{ value: 0.62, lower: 0.47, upper: 0.77 }} />,
    );
    expect(assessed).toContain("<figure");
    expect(assessed).toContain("Concept estimate");
    expect(assessed).toContain("62%");
    expect(assessed).toContain("47%–77%");
    expect(assessed).toContain("<svg");
    expect(assessed).toContain('aria-hidden="true"');
    const zero = renderToStaticMarkup(
      <MasteryRing label="Zero estimate" estimate={{ value: 0, lower: 0, upper: 0 }} />,
    );
    expect(zero).toContain("0%");
    const unknown = renderToStaticMarkup(<MasteryRing label="Not yet assessed" estimate={null} />);
    expect(unknown).toContain("Unassessed");
    expect(unknown).not.toContain("0%");
  });

  test("MasteryRing rejects nonfinite, reversed and inconsistent uncertainty without clamping", () => {
    for (const estimate of [
      { value: Number.NaN, lower: 0.2, upper: 0.7 },
      { value: 0.5, lower: 0.7, upper: 0.4 },
      { value: 1.1, lower: 0.5, upper: 1 },
      { value: -0.1, lower: 0, upper: 0 },
      { value: 0.4, lower: 0, upper: Number.POSITIVE_INFINITY },
    ]) {
      expect(() =>
        renderToStaticMarkup(<MasteryRing label="Invalid" estimate={estimate} />),
      ).toThrow(/invalid|uncertainty|probability/i);
    }
  });
});
