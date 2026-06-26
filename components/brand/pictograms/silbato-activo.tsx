import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function SilbatoActivo({ accent = "#FF6B35", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <circle cx="7" cy="11" r="4" />
      <path d="M 11 10 L 15 10 L 15 13 L 11 13 Z" />
      <circle cx="7" cy="11" r="0.8" fill="currentColor" stroke="none" />
      <path d="M 7 15 L 7 18" />
      <path d="M 5 18 Q 7 20, 9 18" />
      <path d="M 17 8 Q 19 11, 17 14" stroke="var(--pictogram-accent)" />
      <path d="M 19.5 5.5 Q 22.5 11, 19.5 16.5" stroke="var(--pictogram-accent)" />
    </svg>
  );
}
