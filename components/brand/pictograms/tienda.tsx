import { MdStorefront } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Tienda({ accent, style, ...props }: PictogramProps) {
  return <MdStorefront style={{ color: accent, ...style }} {...props} />;
}
