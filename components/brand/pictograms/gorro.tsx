import { MdPool } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Gorro({ accent, style, ...props }: PictogramProps) {
  return <MdPool style={{ color: accent, ...style }} {...props} />;
}
