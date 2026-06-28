import { DEFAULT_PICTOGRAM_PROPS, withAccent, type PictogramProps } from "./types";

export function Personal({ accent = "#0A2E5C", style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={withAccent(style, accent)} {...props}>
      <circle cx="12" cy="7" r="3.2" fill="var(--pictogram-accent)" stroke="none" />
      <path
        d="M 4 21 Q 4 14, 12 14 Q 20 14, 20 21"
        fill="var(--pictogram-accent)"
        stroke="none"
      />
      <path d="M 5 21 Q 5 14.5, 12 14.5" stroke="#FFFFFF" fill="none" />
      <circle cx="17" cy="16" r="2.2" fill="#FFFFFF" stroke="none" />
      <path d="M 19.4 16 L 21.5 16 L 21.5 17.6 L 19.4 17.6 Z" fill="#FFFFFF" stroke="none" />
    </svg>
  );
}
