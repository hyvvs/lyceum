import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart } from "./bar-chart";

const samples = [
  { id: "one", label: "Week one", value: 3 },
  { id: "two", label: "Week two", value: 8 },
  { id: "three", label: "Week three", value: 5 },
] as const;
const meta = {
  title: "Primitives/BarChart",
  component: BarChart,
  tags: ["autodocs"],
  args: { title: "Synthetic weekly activity", units: "sample items", scaleMax: 10, data: samples },
  parameters: {
    stageSurface: "flat",
    a11y: { test: "error" },
    docs: {
      description: {
        component: "Display-only fixture with explicit scale and labels, no real learner chart.",
      },
    },
  },
} satisfies Meta<typeof BarChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Highlighted: Story = { args: { highlightedId: "two" } };
export const EqualValues: Story = {
  args: {
    data: [
      { id: "one", label: "One", value: 5 },
      { id: "two", label: "Two", value: 5 },
    ],
  },
};
export const Zero: Story = {
  args: {
    data: [
      { id: "one", label: "None", value: 0 },
      { id: "two", label: "Five", value: 5 },
    ],
  },
};
export const Empty: Story = { args: { data: [] } };
export const Hover: Story = {};
export const LongText: Story = {
  args: {
    data: [
      { id: "one", label: "A lengthy synthetic category that wraps", value: 8 },
      { id: "two", label: "Another long sample category", value: 6 },
    ],
  },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <BarChart {...args} />
    </div>
  ),
};
export const Light: Story = { globals: { theme: "light" } };
export const DarkFull: Story = { globals: { theme: "dark", transparency: "full" } };
export const HighContrast: Story = { globals: { contrast: "high", transparency: "off" } };
export const DoubleText: Story = { globals: { textScale: "200%" } };
export const ReducedTransparency: Story = { globals: { transparency: "reduced" } };
export const Opaque: Story = { globals: { transparency: "off" } };
export const ReducedMotion: Story = { globals: { motion: "off" } };

const spanishData = [
  { id: "cero", label: "Semana A", value: 0 },
  { id: "uno", label: "Semana B", value: 1.25 },
  { id: "dos", label: "Semana C", value: 2.5 },
] as const;
const spanishArgs = {
  title: "Frecuencias ficticias",
  units: "artículos",
  scaleMax: 10.5,
  data: spanishData,
  highlightedId: "uno",
  scaleLabel: "Escala",
  emptyLabel: "Sin datos todavía",
  highlightLabel: "Destacado",
  locale: "es-ES",
} as const;
export const LocalizedSpanish: Story = { args: spanishArgs };
export const LocalizedSpanishEmpty: Story = {
  args: {
    title: "Frecuencias ficticias",
    units: "artículos",
    scaleMax: 10.5,
    data: [],
    scaleLabel: "Escala",
    emptyLabel: "Sin datos todavía",
    locale: "es-ES",
  },
};
export const LocalizedSpanishDoubleText: Story = {
  globals: { textScale: "200%" },
  args: spanishArgs,
};
