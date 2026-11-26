import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import { WCAG_AA_TAGS } from "../tests/ui/axe";
import {
  PRIMITIVE_FAMILIES,
  assertStoryScanCoverage,
  validatePrimitivesStoryIndex,
} from "../tests/ui/story-inventory";
import { assertExecutedStoryStates, expectedStoryStates } from "../tests/ui/story-scan-coverage";

const requireFromHere = createRequire(import.meta.url);
const requireFromAxe = createRequire(requireFromHere.resolve("@axe-core/playwright"));
const axe = requireFromAxe("axe-core") as {
  getRules: () => { ruleId: string; tags: string[] }[];
};

const sourceFiles = [
  {
    importPath: "./packages/ui/src/button.stories.tsx",
    source: "export const Default = {}; export const Secondary = {};",
  },
];

const defaultEntry = {
  type: "story",
  id: "primitives-button--default",
  title: "Primitives/Button",
  exportName: "Default",
  importPath: sourceFiles[0].importPath,
  tags: ["test"],
};
const secondaryEntry = {
  ...defaultEntry,
  id: "primitives-button--secondary",
  exportName: "Secondary",
};
const index = {
  v: 5,
  entries: {
    [defaultEntry.id]: defaultEntry,
    [secondaryEntry.id]: secondaryEntry,
    "primitives-button--docs": { type: "docs", title: "Primitives/Button" },
  },
};

describe("WCAG A/AA and generated Storybook acceptance contract", () => {
  test("the fail-closed inventory includes every old and new approved surface family", () => {
    expect(PRIMITIVE_FAMILIES).toEqual([
      "Button",
      "Dialog",
      "Select",
      "Tabs",
      "Toast",
      "Tooltip",
      "VisuallyHidden",
      "GlassPanel",
      "GlassCard",
      "TintCard",
      "PillNav",
      "Dock",
      "RoundIconButton",
      "SegmentedControl",
    ]);
    const approved = PRIMITIVE_FAMILIES.slice(7).map((name) => ({
      ...defaultEntry,
      id: `primitives-${name.toLowerCase()}--dark-full`,
      title: `Primitives/${name}`,
    }));
    expect(expectedStoryStates(approved)).toHaveLength(7);
  });
  test("covers every supported WCAG 2.0/2.1/2.2 A/AA rule tag in installed axe", () => {
    const supported = [...new Set(axe.getRules().flatMap((rule) => rule.tags))]
      .filter((tag) => /^wcag(?:2|21|22)(?:a|aa)$/.test(tag))
      .sort();
    expect([...WCAG_AA_TAGS].sort()).toEqual(supported);
    expect(WCAG_AA_TAGS).toContain("wcag21a");
    expect(
      axe.getRules().filter((rule) => rule.tags.some((tag) => WCAG_AA_TAGS.includes(tag))),
    ).toContainEqual(expect.objectContaining({ ruleId: "label-content-name-mismatch" }));
  });

  test("selects exactly the generated story entries and excludes docs", () => {
    expect(validatePrimitivesStoryIndex(index, sourceFiles).map((story) => story.id)).toEqual([
      "primitives-button--default",
      "primitives-button--secondary",
    ]);
  });

  test("fails closed when the built index omits a source-exported story", () => {
    const missing = structuredClone(index);
    delete (missing.entries as Record<string, unknown>)[defaultEntry.id];
    expect(() => validatePrimitivesStoryIndex(missing, sourceFiles)).toThrow(/Default/);
  });

  test("fails closed on newly exported, unbuilt stories", () => {
    expect(() =>
      validatePrimitivesStoryIndex(index, [
        { ...sourceFiles[0], source: `${sourceFiles[0].source} export const NewStory = {};` },
      ]),
    ).toThrow(/NewStory/);
  });

  test("fails closed on phantom index entries and invalid id/type/test tags", () => {
    const phantom = structuredClone(index);
    phantom.entries["primitives-button--phantom"] = {
      ...defaultEntry,
      id: "primitives-button--phantom",
      exportName: "Phantom",
    };
    expect(() => validatePrimitivesStoryIndex(phantom, sourceFiles)).toThrow(/Phantom/);
    const invalidId = structuredClone(index);
    invalidId.entries[defaultEntry.id].id = "some-other-id";
    expect(() => validatePrimitivesStoryIndex(invalidId, sourceFiles)).toThrow(/id/);
    const absentTag = structuredClone(index);
    absentTag.entries[defaultEntry.id].tags = [];
    expect(() => validatePrimitivesStoryIndex(absentTag, sourceFiles)).toThrow(/test/);
    const retyped = structuredClone(index);
    retyped.entries[defaultEntry.id].type = "docs";
    expect(() => validatePrimitivesStoryIndex(retyped, sourceFiles)).toThrow(/Default/);
    const foreignPrimitive = structuredClone(index);
    foreignPrimitive.entries[defaultEntry.id].importPath = "./stories/external.stories.tsx";
    expect(() => validatePrimitivesStoryIndex(foreignPrimitive, sourceFiles)).toThrow(/id\/title/);
  });

  test("fails scan coverage when a generated story is missed or fabricated", () => {
    const stories = validatePrimitivesStoryIndex(index, sourceFiles);
    expect(() => assertStoryScanCoverage(stories, [defaultEntry.id])).toThrow(/secondary/);
    expect(() =>
      assertStoryScanCoverage(stories, [defaultEntry.id, secondaryEntry.id, "unknown"]),
    ).toThrow(/unknown/);
    expect(() =>
      assertStoryScanCoverage(stories, [defaultEntry.id, secondaryEntry.id]),
    ).not.toThrow();
  });

  test("fails the whole-suite reporter on a missing axe execution, not a caller's claimed ID", () => {
    const stories = validatePrimitivesStoryIndex(index, sourceFiles);
    const checked = [
      "AXE_STORY_CHECKED primitives-button--default state=default rules=64 violations=0 incomplete=none",
      "AXE_STORY_CHECKED primitives-button--secondary state=secondary rules=64 violations=0 incomplete=none",
    ];
    expect(() => assertExecutedStoryStates(stories, checked)).not.toThrow();
    expect(() => assertExecutedStoryStates(stories, checked.slice(0, 1))).toThrow(/secondary/);
    expect(() =>
      assertExecutedStoryStates(stories, [
        ...checked,
        "AXE_STORY_CHECKED unknown state=ghost rules=64 violations=0 incomplete=none",
      ]),
    ).toThrow(/unknown/);
    expect(() => assertExecutedStoryStates(stories, [])).toThrow(/default/);
  });

  test("requires actual open-state proof for the nested Select and Toast integrations", () => {
    const selectEntry = {
      ...defaultEntry,
      id: "primitives-select--dialog-integration",
      title: "Primitives/Select",
    };
    const toastEntry = {
      ...defaultEntry,
      id: "primitives-toast--dialog-select-integration",
      title: "Primitives/Toast",
    };
    const checked = [
      "AXE_STORY_CHECKED primitives-select--dialog-integration state=dialog-open rules=64 violations=0 incomplete=none",
      "AXE_STORY_CHECKED primitives-select--dialog-integration state=select-open rules=64 violations=0 incomplete=none",
      "AXE_STORY_CHECKED primitives-toast--dialog-select-integration state=dialog-select-open rules=64 violations=0 incomplete=none",
      "AXE_STORY_CHECKED primitives-toast--dialog-select-integration state=saved-toast-visible rules=64 violations=0 incomplete=none",
    ];
    expect(() => assertExecutedStoryStates([selectEntry, toastEntry], checked)).not.toThrow();
    expect(() => assertExecutedStoryStates([selectEntry, toastEntry], checked.slice(1))).toThrow(
      /dialog-open/,
    );
    expect(() => assertExecutedStoryStates([selectEntry, toastEntry], checked.slice(0, 3))).toThrow(
      /saved-toast-visible/,
    );
  });
});
