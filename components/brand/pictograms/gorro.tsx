import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Gorro({ accent = "#F4C430", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path d="M 5 13 C 5 8, 8 6, 12 6 C 16 6, 19 8, 19 13" />
      <path d="M 5 13 L 3 14 L 3 18 L 5 18" />
      <path d="M 19 13 L 21 14 L 21 18 L 19 18" />
      <path d="M 5 13 L 5 18 L 19 18 L 19 13" />
      <path d="M 9 11 L 14.5 11 L 11.5 16" stroke="var(--pictogram-accent)" />
    </svg>
  );
}
