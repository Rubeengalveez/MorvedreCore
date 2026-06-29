import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Megafone({ accent = "#FF6B35", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <path
        d="M 4 10 L 4 14 L 7 14 L 13 19 L 13 5 L 7 10 Z"
        fill="var(--pictogram-accent)"
        stroke="none"
      />
      <path
        d="M 16 8 Q 19 12, 16 16"
        stroke="var(--pictogram-accent)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M 18 5 Q 22 12, 18 19"
        stroke="var(--pictogram-accent)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
