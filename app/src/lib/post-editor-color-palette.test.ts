import { describe, expect, it } from "vitest";

import {
  POST_EDITOR_COLOR_PALETTE,
  POST_EDITOR_COLOR_PALETTE_COLUMNS,
  syncSunEditorColorSwatches,
} from "@/lib/post-editor-color-palette";

type MockButton = {
  children: MockElement[];
  ownerDocument: {
    createElement: (tagName: string) => MockElement;
  };
  getAttribute: (name: string) => string | null;
  querySelector: (selector: string) => MockElement | null;
  replaceChildren: (...children: MockElement[]) => void;
  setAttribute: (name: string, value: string) => void;
  style: {
    getPropertyValue: (name: string) => string;
    setProperty: (name: string, value: string) => void;
  };
};

type MockElement = {
  className: string;
  attributes: Map<string, string>;
  setAttribute: (name: string, value: string) => void;
  style: {
    backgroundColor: string;
  };
};

function createMockElement(): MockElement {
  return {
    className: "",
    attributes: new Map<string, string>(),
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    style: {
      backgroundColor: "",
    },
  };
}

function createMockButton(initialColor: string): MockButton {
  const attributes = new Map<string, string>([["data-value", initialColor]]);
  const styleProperties = new Map<string, string>();
  const button: MockButton = {
    children: [],
    ownerDocument: {
      createElement: () => createMockElement(),
    },
    getAttribute: (name) => attributes.get(name) ?? null,
    querySelector: (selector) => {
      if (selector !== ".tp-se-color-swatch-fill") {
        return null;
      }
      return (button.children.find((child) => child.className === "tp-se-color-swatch-fill") ?? null) as MockElement | null;
    },
    replaceChildren: (...children) => {
      button.children = children;
    },
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

  return button;
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

    expect(redButton.getAttribute("data-tp-swatch")).toBe("#ff0000");
    expect(redButton.children[0]?.className).toBe("tp-se-color-swatch-fill");
    expect(redButton.children[0]?.style.backgroundColor).toBe("#ff0000");
    expect(whiteButton.getAttribute("data-tp-swatch")).toBe("#ffffff");
    expect(whiteButton.children[0]?.style.backgroundColor).toBe("#ffffff");
  });
});
