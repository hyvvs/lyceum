import type { Meta, StoryObj } from "@storybook/react-vite";
import { MasteryRing } from "./mastery-ring";

const meta = {
  title: "Primitives/MasteryRing",
  component: MasteryRing,
  tags: ["autodocs"],
  args: {
    label: "Synthetic concept mastery estimate",
    estimate: { value: 0.62, lower: 0.47, upper: 0.77 },
  },
  parameters: {
    stageSurface: "flat",
    a11y: { test: "error" },
    docs: {
      description: {
        component:
          "Synthetic, precomputed pKnown probability and uncertainty only. Never a production estimate.",
      },
    },
  },
} satisfies Meta<typeof MasteryRing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Zero: Story = { args: { estimate: { value: 0, lower: 0, upper: 0 } } };
export const Full: Story = { args: { estimate: { value: 1, lower: 0.9, upper: 1 } } };
export const NarrowInterval: Story = {
  args: { estimate: { value: 0.5, lower: 0.49, upper: 0.51 } },
};
export const Unknown: Story = { args: { estimate: null } };
export const Hover: Story = {};
export const LongText: Story = {
  args: { label: "A long synthetic concept description, with uncertainty from external data" },
};
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <MasteryRing {...args} />
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

export const LocalizedSpanish: Story = {
  args: {
    label: "Probabilidad ficticia",
    estimate: { value: 0.625, lower: 0.475, upper: 0.775 },
    unassessedLabel: "Sin evaluar",
    uncertaintyLabel: "Incertidumbre",
    locale: "es-ES",
  },
};
