import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Exclusion({ accent = "#EF4444", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" fill="var(--pictogram-accent)" />
      <path d="M 8 9 L 16 15" stroke="#FFFFFF" />
      <path d="M 16 9 L 8 15" stroke="#FFFFFF" />
    </svg>
  );
}
