import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Equipo({ accent = "#0A2E5C", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path
        d="M 12 3 L 20 6 L 20 12 Q 20 18, 12 21 Q 4 18, 4 12 L 4 6 Z"
        fill="var(--pictogram-accent)"
      />
      <path
        d="M 12 7 L 16 8.5 L 16 12 Q 16 15, 12 16.5 Q 8 15, 8 12 L 8 8.5 Z"
        fill="#FFFFFF"
        stroke="none"
      />
      <path d="M 10 11 C 10 10, 11 9.5, 12 9.5 C 13 9.5, 14 10, 14 11 L 14 13 L 10 13 Z" fill="var(--pictogram-accent)" stroke="none" />
    </svg>
  );
}
