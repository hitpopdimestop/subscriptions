// Pure WCAG contrast maths, kept free of Playwright so it can be unit tested.
// Callers must pass sRGB; `getComputedStyle` returns lab()/oklch() in modern
// browsers, so normalize first (see `renderedColors` in e2e/contrast.ts).
export function relativeLuminance(color: string) {
  const channels = color
    .match(
      /^rgba?\(\s*(\d+(?:\.\d+)?|\.\d+)\s*,\s*(\d+(?:\.\d+)?|\.\d+)\s*,\s*(\d+(?:\.\d+)?|\.\d+)(?:\s*,\s*(?:\d+(?:\.\d+)?|\.\d+))?\s*\)$/i,
    )
    ?.slice(1, 4)
    .map(Number);

  if (!channels) {
    throw new Error(`Expected an rgb color, received ${color}`);
  }

  return channels.reduce((luminance, channel, index) => {
    const srgb = channel / 255;
    const linear =
      srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    const coefficient = [0.2126, 0.7152, 0.0722][index];

    return luminance + linear * coefficient;
  }, 0);
}

export function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}
