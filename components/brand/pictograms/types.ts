import type { CSSProperties, SVGProps } from "react";

export type PictogramProps = Omit<SVGProps<SVGSVGElement>, "style"> & {
  accent?: string;
  style?: CSSProperties;
};

export const DEFAULT_PICTOGRAM_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function withAccent(
  style: CSSProperties | undefined,
  accent: string,
): CSSProperties {
  return { ...style, "--pictogram-accent": accent } as CSSProperties;
}
