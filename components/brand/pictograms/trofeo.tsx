import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Trofeo({ accent = "#F4C430", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path d="M 8 4 L 16 4 L 16 9 C 16 12, 14 14, 12 14 C 10 14, 8 12, 8 9 Z" fill="var(--pictogram-accent)" stroke="none" />
      <path d="M 8 6 L 5 6 L 5 9 C 5 11, 7 12, 8 12" />
      <path d="M 16 6 L 19 6 L 19 9 C 19 11, 17 12, 16 12" />
      <path d="M 12 14 L 12 17" />
      <path d="M 9 20 L 15 20" />
      <path d="M 10 17 L 14 17 L 15 20 L 9 20 Z" />
    </svg>
  );
}
