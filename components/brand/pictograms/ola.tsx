import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Ola({ accent = "#0A2E5C", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path
        d="M 2 13 C 5 8, 8 8, 11 13 C 14 18, 17 18, 20 13 C 21 11, 22 10, 22 10"
        fill="none"
      />
      <path
        d="M 2 18 Q 5 16, 8 18 T 14 18 T 20 18"
        fill="none"
      />
      <path
        d="M 4 9 C 6 6, 9 6, 12 9 C 15 12, 18 12, 20 9 L 20 4 L 4 4 Z"
        fill="var(--pictogram-accent)"
        stroke="none"
      />
    </svg>
  );
}
