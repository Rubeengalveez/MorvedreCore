import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Balon({ accent = "#F4C430", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <circle cx="12" cy="12" r="9" fill="var(--pictogram-accent)" />
      <path d="M 3 12 L 21 12" stroke="#FFFFFF" />
      <path d="M 12 3 L 12 21" stroke="#FFFFFF" />
      <path d="M 5.5 5.5 Q 12 12, 5.5 18.5" stroke="#FFFFFF" fill="none" />
      <path d="M 18.5 5.5 Q 12 12, 18.5 18.5" stroke="#FFFFFF" fill="none" />
    </svg>
  );
}
