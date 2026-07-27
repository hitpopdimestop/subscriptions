export function relativeLuminance(color: string) {
  const channels = color.match(/\d+(?:\.\d+)?/g)?.map(Number);

  if (!channels || channels.length < 3) {
    throw new Error(`Expected an rgb color, received ${color}`);
  }

  return channels.slice(0, 3).reduce((luminance, channel, index) => {
    const srgb = channel / 255;
    const linear =
      srgb <= 0.04045
        ? srgb / 12.92
        : Math.pow((srgb + 0.055) / 1.055, 2.4);
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
