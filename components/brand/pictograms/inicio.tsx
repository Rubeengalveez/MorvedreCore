import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Inicio({ accent = "#F4C430", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path d="M 3 12 L 12 4 L 21 12 L 21 20 L 3 20 Z" />
      <path d="M 10 20 L 10 14 L 14 14 L 14 20" />
      <circle cx="12" cy="17" r="1.4" fill="var(--pictogram-accent)" stroke="none" />
    </svg>
  );
}
