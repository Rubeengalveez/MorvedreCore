import { DEFAULT_PICTOGRAM_PROPS, type PictogramProps } from "./types";

export function ChevronDerecha({ style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={style} {...props}>
      <path d="M 9 5 Q 16 12, 9 19" />
      <path d="M 5 15 L 9 19 L 13 15" />
    </svg>
  );
}
