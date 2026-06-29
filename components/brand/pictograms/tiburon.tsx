import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Tiburon({ accent = "#062048", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path
        d="M 2 14 Q 6 6, 13 7 L 18 4 L 19 8 Q 22 9, 22 12 Q 22 16, 18 17 L 14 19 Q 9 22, 5 20 L 3 18 Z"
        fill="var(--pictogram-accent)"
        stroke="none"
      />
      <circle cx="7" cy="13" r="0.8" fill="#FFFFFF" stroke="none" />
      <path d="M 5 18 L 8 19" stroke="#FFFFFF" strokeWidth="0.6" fill="none" />
      <path d="M 9 19.5 L 12 20" stroke="#FFFFFF" strokeWidth="0.6" fill="none" />
      <path d="M 13 19.5 L 16 19" stroke="#FFFFFF" strokeWidth="0.6" fill="none" />
    </svg>
  );
}
