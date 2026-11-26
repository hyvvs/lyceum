import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { BarChart } from "./bar-chart";
import { ChatBubble } from "./chat-bubble";
import { MasteryRing } from "./mastery-ring";
import { RoundIconButton } from "./round-icon-button";
import { SegmentedControl } from "./segmented-control";
import { StatCard } from "./stat-card";

/** These are invented display-only examples, never real learner measurements. */
describe("B5 consumer-owned localization contract", () => {
  test("native SegmentedControl keeps English fallback and accepts Spanish empty wording with independent RTL", () => {
    const props = {
      groupLabel: "Modo de ejemplo",
      name: "modo",
      value: "",
      options: [] as const,
      onValueChange: () => {},
    };
    const english = renderToStaticMarkup(<SegmentedControl {...props} />);
    expect(english).toContain("No choices available");
    const spanish = renderToStaticMarkup(
      <SegmentedControl {...props} emptyLabel="No hay opciones disponibles" dir="rtl" />,
    );
    expect(spanish).toContain("No hay opciones disponibles");
    expect(spanish).not.toContain("No choices available");
    expect(spanish).toContain('dir="rtl"');
    expect(spanish).toContain("<fieldset");
    expect(spanish).not.toContain('type="radio"');
  });

  test("BarChart makes Spanish scale, numeric bounds, units, values and highlight readable", () => {
    const data = Object.freeze([
      Object.freeze({ id: "cero", label: "Semana A", value: 0 }),
      Object.freeze({ id: "uno", label: "Semana B", value: 1.25 }),
      Object.freeze({ id: "dos", label: "Semana C", value: 2.5 }),
    ]);
    const html = renderToStaticMarkup(
      <BarChart
        title="Frecuencias ficticias"
        units="artículos"
        scaleMax={10.5}
        data={data}
        highlightedId="uno"
        scaleLabel="Escala"
        emptyLabel="Sin datos"
        highlightLabel="Destacado"
        locale="es-ES"
      />,
    );
    expect(html).toContain("Escala: 0–10,5 artículos");
    expect(html).toContain("0 artículos");
    expect(html).toContain("1,25 artículos");
    expect(html).toContain("2,5 artículos");
    expect(html).toContain("★ Destacado");
    expect(html).not.toContain("Highlighted");
    expect(html).not.toContain("1.25 artículos");
    expect(html.match(/data-highlighted="true"/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true"');
    expect(data[1]?.value).toBe(1.25);
  });

  test("BarChart localizes an actually empty state and preserves numeric English defaults", () => {
    const empty = renderToStaticMarkup(
      <BarChart
        title="Gráfico vacío"
        units="ejemplos"
        scaleMax={2.5}
        data={[]}
        emptyLabel="Sin datos todavía"
        scaleLabel="Escala"
        locale="es-ES"
      />,
    );
    expect(empty).toContain("Sin datos todavía");
    expect(empty).toContain("Escala: 0–2,5 ejemplos");
    expect(empty).not.toContain("No data available");
    const en = renderToStaticMarkup(
      <BarChart
        title="Synthetic numbers"
        units="items"
        scaleMax={2.5}
        data={[{ id: "x", label: "Item X", value: 1.25 }]}
      />,
    );
    expect(en).toContain("Scale: 0–2.5 items");
    expect(en).toContain("1.25 items");
  });

  test("MasteryRing shows locale-aware decimal percentages and a consumer-named uncertainty interval", () => {
    const estimate = Object.freeze({ value: 0.625, lower: 0.475, upper: 0.775 });
    const html = renderToStaticMarkup(
      <MasteryRing
        label="Probabilidad hipotética"
        estimate={estimate}
        uncertaintyLabel="Incertidumbre"
        locale="es-ES"
      />,
    ).replace(/[\u00a0\u202f]/g, " ");
    expect(html).toContain("62,5 %");
    expect(html).toContain("Incertidumbre: 47,5 %–77,5 %");
    expect(html).not.toContain("Uncertainty:");
    expect(html).toContain('aria-hidden="true"');
    expect(estimate.value).toBe(0.625);
    expect(estimate.lower).toBe(0.475);
    expect(estimate.upper).toBe(0.775);
  });

  test("localized MasteryRing zero stays assessed; unknown stays unassessed", () => {
    const assessedZero = renderToStaticMarkup(
      <MasteryRing
        label="Estimación de ejemplo"
        estimate={{ value: 0, lower: 0, upper: 0 }}
        locale="es-ES"
        uncertaintyLabel="Incertidumbre"
        unassessedLabel="Sin evaluar"
      />,
    );
    expect(assessedZero).toContain('data-assessed="true"');
    expect(assessedZero).toContain("0");
    expect(assessedZero).not.toContain("Sin evaluar");
    const unknown = renderToStaticMarkup(
      <MasteryRing label="Estimación de ejemplo" estimate={null} unassessedLabel="Sin evaluar" />,
    );
    expect(unknown).toContain('data-assessed="false"');
    expect(unknown).toContain("Sin evaluar");
    expect(unknown).not.toContain("0%");
  });

  test("StatCard formats numeric Spanish values but preserves consumer preformatted strings", () => {
    const numeric = renderToStaticMarkup(
      <StatCard label="Valor ilustrativo" value={12345.5} locale="es-ES" />,
    );
    expect(numeric).toContain('data-available="true">12.345,5</p>');
    const negative = renderToStaticMarkup(
      <StatCard label="Saldo ilustrativo" value={-3.5} locale="es-ES" />,
    );
    expect(negative).toContain(">-3,5</p>");
    const preformatted = renderToStaticMarkup(
      <StatCard label="Cadena explícita" value="1,234.5 custom units" locale="es-ES" />,
    );
    expect(preformatted).toContain(">1,234.5 custom units</p>");
    const zero = renderToStaticMarkup(<StatCard label="Cero real" value={0} locale="es-ES" />);
    expect(zero).toContain('data-available="true">0</p>');
    const missing = renderToStaticMarkup(
      <StatCard label="Sin valor" value={null} unavailableLabel="Sin datos" locale="es-ES" />,
    );
    expect(missing).toContain('data-available="false">Sin datos</p>');
    expect(missing).not.toContain('data-available="true"');
  });

  test("RoundIconButton and ChatBubble already accept fully caller-localized visible/accessible wording", () => {
    const button = renderToStaticMarkup(
      <RoundIconButton
        aria-label="Abrir avisos"
        icon={<span aria-hidden="true">!</span>}
        badge={{ text: "2", label: "Dos avisos ficticios" }}
      />,
    );
    expect(button).toContain('aria-label="Abrir avisos"');
    expect(button).toContain("Dos avisos ficticios");
    const chat = renderToStaticMarkup(
      <ChatBubble
        speaker="tutor"
        speakerLabel="Guía de ejemplo"
        streaming
        streamingLabel="Respuesta en curso"
        emptyLabel="Sin contenido"
        dir="rtl"
        lang="es"
      />,
    );
    expect(chat).toContain("Respuesta en curso");
    expect(chat).toContain("Sin contenido");
    expect(chat).toContain('dir="rtl"');
    expect(chat).not.toContain("Response in progress");
    expect(chat).not.toContain("No message content");
  });

  test("small but nonzero finite BarChart numbers never display as zero while bars remain nonzero", () => {
    const html = renderToStaticMarkup(
      <BarChart
        title="Small synthetic samples"
        units="items"
        scaleMax={0.0004}
        data={[{ id: "tiny", label: "Sample", value: 0.0002 }]}
        locale="en-US"
      />,
    );
    expect(html).toContain("Scale: 0–0.0004 items");
    expect(html).toContain("0.0002 items");
    expect(html).not.toContain("Scale: 0–0 items");
    expect(html).toContain('style="height:50%"');
    const spanish = renderToStaticMarkup(
      <BarChart
        title="Cantidades ficticias"
        units="artículos"
        scaleMax={0.0004}
        data={[{ id: "min", label: "Muestra", value: 0.0002 }]}
        scaleLabel="Escala"
        locale="es-ES"
      />,
    );
    expect(spanish).toContain("Escala: 0–0,0004 artículos");
    expect(spanish).toContain("0,0002 artículos");
  });

  test("tiny numeric StatCard values and assessed mastery percentages remain nonzero", () => {
    const stat = renderToStaticMarkup(
      <StatCard label="Tiny synthetic measurement" value={0.0002} locale="es-ES" />,
    );
    expect(stat).toContain('data-available="true">0,0002</p>');
    const negative = renderToStaticMarkup(
      <StatCard label="Negative synthetic measurement" value={-0.0002} locale="es-ES" />,
    );
    expect(negative).toContain(">-0,0002</p>");
    const ring = renderToStaticMarkup(
      <MasteryRing
        label="Very small assessed synthetic estimate"
        estimate={{ value: 0.000004, lower: 0.000001, upper: 0.000008 }}
        locale="es-ES"
        uncertaintyLabel="Incertidumbre"
      />,
    ).replace(/[\u00a0\u202f]/g, " ");
    expect(ring).toContain('data-assessed="true"');
    expect(ring).toContain("0,0004 %");
    expect(ring).toContain("Incertidumbre: 0,0001 %–0,0008 %");
    expect(ring).not.toContain('data-assessed="false"');
  });

  test("BarChart allows consumer-controlled complete scale and unit grammar without changing geometry", () => {
    const html = renderToStaticMarkup(
      <BarChart
        title="Valores inventados"
        units="artículos"
        scaleMax={2.5}
        data={[{ id: "uno", label: "Semana A", value: 1.25 }]}
        locale="es-ES"
        scaleDescription={(max, units) => `El límite es ${max.toLocaleString("es-ES")} ${units}`}
        formatDatum={(value, units) => `${units}: ${value.toLocaleString("es-ES")}`}
      />,
    );
    expect(html).toContain("El límite es 2,5 artículos");
    expect(html).toContain("artículos: 1,25");
    expect(html).not.toContain("Scale:");
    expect(html).toContain('style="height:50%"');
  });
});
