import { MdChevronRight } from "react-icons/md";
import type { PictogramProps } from "./types";

export function ChevronDerecha({ accent, style, ...props }: PictogramProps) {
  return <MdChevronRight style={{ color: accent, ...style }} {...props} />;
}
