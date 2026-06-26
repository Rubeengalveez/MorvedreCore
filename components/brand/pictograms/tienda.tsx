import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Tienda({ accent = "#FF6B35", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path d="M 5 8 L 6 20 L 18 20 L 19 8 Z" />
      <path d="M 9 8 C 9 5, 15 5, 15 8" stroke="var(--pictogram-accent)" />
    </svg>
  );
}
