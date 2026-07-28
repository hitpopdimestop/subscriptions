import type { Locator } from "@playwright/test";

export async function renderedColors(
  foreground: Locator,
  background: Locator,
) {
  const backgroundElement = await background.elementHandle();

  if (!backgroundElement) {
    throw new Error("Expected a visible contrast background.");
  }

  return foreground.evaluate((element, backgroundNode) => {
    const context = document.createElement("canvas").getContext("2d");

    if (!context) {
      throw new Error("Expected a canvas context for color normalization.");
    }

    const toRgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;

      return `rgb(${red}, ${green}, ${blue})`;
    };

    return {
      backgroundColor: toRgb(getComputedStyle(backgroundNode).backgroundColor),
      color: toRgb(getComputedStyle(element).color),
    };
  }, backgroundElement);
}
