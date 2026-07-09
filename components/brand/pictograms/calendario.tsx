import { MdCalendarMonth } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Calendario({ accent, style, ...props }: PictogramProps) {
  return <MdCalendarMonth style={{ color: accent, ...style }} {...props} />;
}
