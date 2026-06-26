import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Calendario({ accent = "#F4C430", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <rect x="3" y="6" width="18" height="15" rx="1.5" />
      <path d="M 3 11 L 21 11" />
      <path d="M 8 3 L 8 8" />
      <path d="M 16 3 L 16 8" />
      <rect x="13" y="14" width="4" height="3.5" rx="0.5" fill="var(--pictogram-accent)" stroke="none" />
    </svg>
  );
}
