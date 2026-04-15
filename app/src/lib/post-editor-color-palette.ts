export const POST_EDITOR_COLOR_PALETTE_COLUMNS = 8;

export const POST_EDITOR_COLOR_PALETTE = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#d9d9d9",
  "#efefef",
  "#ffffff",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#2563eb",
  "#0000ff",
  "#9900ff",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ea9999",
  "#f9cb9c",
  "#ffe599",
  "#b6d7a8",
  "#a2c4c9",
  "#a4c2f4",
  "#9fc5e8",
  "#b4a7d6",
  "#e06666",
  "#f6b26b",
  "#ffd966",
  "#93c47d",
  "#76a5af",
  "#6d9eeb",
  "#6fa8dc",
  "#8e7cc3",
  "#cc0000",
  "#e69138",
  "#f1c232",
  "#6aa84f",
  "#45818e",
  "#3c78d8",
  "#3d85c6",
  "#674ea7",
  "#990000",
  "#b45f06",
  "#bf9000",
  "#38761d",
  "#134f5c",
  "#1155cc",
  "#0b5394",
  "#351c75",
  "#660000",
  "#783f04",
  "#7f6000",
  "#274e13",
  "#0c343d",
  "#1c4587",
  "#073763",
  "#20124d",
] as const;

export function syncSunEditorColorSwatches(root: ParentNode) {
  const colorButtons = root.querySelectorAll<HTMLButtonElement>(
    ".se-list-layer .se-selector-color .se-color-pallet li > button[data-value]",
  );

  colorButtons.forEach((button) => {
    const colorValue = button.getAttribute("data-value")?.trim().toLowerCase();
    if (!colorValue) {
      return;
    }

    button.setAttribute("data-tp-swatch", colorValue);

    let fill = button.querySelector<HTMLElement>(".tp-se-color-swatch-fill");
    if (!fill) {
      fill = button.ownerDocument.createElement("span");
      fill.className = "tp-se-color-swatch-fill";
      fill.setAttribute("aria-hidden", "true");
      button.replaceChildren(fill);
    }

    fill.style.backgroundColor = colorValue;
  });
}
