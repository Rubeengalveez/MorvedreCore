import { DEFAULT_PICTOGRAM_PROPS, type PictogramProps } from "./types";

export function Usuario({ style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={style} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M 4 21 Q 4 14, 12 14 Q 20 14, 20 21" />
    </svg>
  );
}
