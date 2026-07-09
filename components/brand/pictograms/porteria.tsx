import { MdGridOn } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Porteria({ accent, style, ...props }: PictogramProps) {
  return <MdGridOn style={{ color: accent, ...style }} {...props} />;
}
