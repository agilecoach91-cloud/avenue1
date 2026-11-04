import type { CSSProperties } from "react";

/** Picks dark or light text for a background colour (WCAG relative luminance). */
export function readableInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#14212b";
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  const INK_LUMINANCE = 0.0139; // #14212b
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithInk = (l + 0.05) / (INK_LUMINANCE + 0.05);
  return contrastWithInk >= contrastWithWhite ? "#14212b" : "#ffffff";
}

export function brandStyle(color: string): CSSProperties {
  return { ["--brand" as string]: color, ["--brand-ink" as string]: readableInk(color) };
}
