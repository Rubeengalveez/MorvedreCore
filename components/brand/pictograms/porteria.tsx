import { DEFAULT_PICTOGRAM_PROPS, type PictogramProps } from "./types";

export function Porteria({ style, ...props }: PictogramProps) {
  return (
    <svg {...DEFAULT_PICTOGRAM_PROPS} style={style} {...props}>
      <rect x="2" y="8" width="20" height="12" />
      <path d="M 2 12 L 22 12" />
      <path d="M 2 16 L 22 16" />
      <path d="M 7 8 L 7 20" />
      <path d="M 12 8 L 12 20" />
      <path d="M 17 8 L 17 20" />
    </svg>
  );
}
