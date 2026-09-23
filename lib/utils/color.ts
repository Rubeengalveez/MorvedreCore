export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.trim().replace("#", "");
  if (value.length !== 6 && value.length !== 3) {
    return `rgba(30, 90, 168, ${alpha})`;
  }
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(30, 90, 168, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixHexWithWhite(hex: string, colorAmount: number): string {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const fallback = [30, 90, 168] as const;
  const parsed =
    full.length === 6
      ? [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
      : fallback;
  const [r, g, b] = parsed.some(Number.isNaN) ? fallback : parsed;
  const amount = Math.min(1, Math.max(0, colorAmount));
  const mix = (channel: number) => Math.round(255 - (255 - channel) * amount);

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
