import { MdWaves } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Tiburon({ accent, style, ...props }: PictogramProps) {
  return <MdWaves style={{ color: accent, ...style }} {...props} />;
}
