import { MdGroups } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Equipo({ accent, style, ...props }: PictogramProps) {
  return <MdGroups style={{ color: accent, ...style }} {...props} />;
}
