import { MdSports } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Silbato({ accent, style, ...props }: PictogramProps) {
  return <MdSports style={{ color: accent, ...style }} {...props} />;
}
