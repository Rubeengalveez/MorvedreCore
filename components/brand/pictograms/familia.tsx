import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Familia({ accent = "#0A2E5C", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path d="M 4 11 L 12 4 L 20 11 L 20 21 L 4 21 Z" fill="var(--pictogram-accent)" stroke="none" />
      <path d="M 4 11 L 12 4 L 20 11" />
      <circle cx="8" cy="9" r="2.2" fill="#FFFFFF" stroke="none" />
      <circle cx="16" cy="9" r="2.2" fill="#FFFFFF" stroke="none" />
      <path d="M 5 18 C 5 14.5, 7.5 13, 9 13 C 10.5 13, 12 14, 12 15.5" stroke="#FFFFFF" fill="none" />
      <path d="M 12 15.5 C 12 14, 13.5 13, 15 13 C 16.5 13, 19 14.5, 19 18" stroke="#FFFFFF" fill="none" />
      <circle cx="12" cy="17" r="1.6" fill="#FFFFFF" stroke="none" />
    </svg>
  );
}
