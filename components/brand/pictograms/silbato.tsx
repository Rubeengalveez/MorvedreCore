import { DEFAULT_PICTOGRAM_PROPS, type PictogramProps } from "./types";

export function Silbato({ style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={style} {...props}>
      <circle cx="9" cy="10" r="5" />
      <path d="M 14 9 L 20 9 L 20 12 L 14 12 Z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M 9 15 L 9 19" />
      <path d="M 6 19 Q 9 22, 12 19" />
    </svg>
  );
}
