import { describe, expect, it } from "vitest";

import {
  POST_EDITOR_COLOR_PALETTE,
  POST_EDITOR_COLOR_PALETTE_COLUMNS,
  syncSunEditorColorSwatches,
} from "@/lib/post-editor-color-palette";

type MockButton = {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  style: {
    getPropertyValue: (name: string) => string;
    setProperty: (name: string, value: string) => void;
  };
};

function createMockButton(initialColor: string): MockButton {
  const attributes = new Map<string, string>([["data-value", initialColor]]);
  const styleProperties = new Map<string, string>();

  return {
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => {
      attributes.set(name, value);
    },
    style: {
      getPropertyValue: (name) => styleProperties.get(name) ?? "",
      setProperty: (name, value) => {
        styleProperties.set(name, value);
      },
    },
  };
}

describe("post editor color palette", () => {
  it("ships an 8-column palette with a full 64-color grid", () => {
    expect(POST_EDITOR_COLOR_PALETTE_COLUMNS).toBe(8);
    expect(POST_EDITOR_COLOR_PALETTE).toHaveLength(64);
    expect(POST_EDITOR_COLOR_PALETTE[0]).toBe("#000000");
    expect(POST_EDITOR_COLOR_PALETTE).toContain("#2563eb");
    expect(POST_EDITOR_COLOR_PALETTE.at(-1)).toBe("#20124d");
  });

  it("decorates SunEditor swatches with explicit CSS variables", () => {
    const redButton = createMockButton("#FF0000");
    const whiteButton = createMockButton("#ffffff");
    const root = {
      querySelectorAll: () => [redButton, whiteButton],
    } as unknown as ParentNode;

    syncSunEditorColorSwatches(root);

    expect(redButton.style.getPropertyValue("--tp-color-swatch")).toBe("#ff0000");
    expect(redButton.getAttribute("data-tp-swatch")).toBe("#ff0000");
    expect(whiteButton.style.getPropertyValue("--tp-color-swatch")).toBe("#ffffff");
    expect(whiteButton.getAttribute("data-tp-swatch")).toBe("#ffffff");
  });
});
