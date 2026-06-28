import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function FileUp({ accent = "#0A2E5C", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path d="M 6 3 L 14 3 L 19 8 L 19 21 L 6 21 Z" />
      <path d="M 14 3 L 14 8 L 19 8" />
      <path d="M 12 12 L 12 18" stroke="var(--pictogram-accent)" />
      <path d="M 9 15 L 12 12 L 15 15" stroke="var(--pictogram-accent)" />
    </svg>
  );
}
