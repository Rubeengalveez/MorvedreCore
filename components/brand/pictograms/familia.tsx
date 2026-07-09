import { MdFamilyRestroom } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Familia({ accent, style, ...props }: PictogramProps) {
  return <MdFamilyRestroom style={{ color: accent, ...style }} {...props} />;
}
