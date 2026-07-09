import { MdBadge } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Personal({ accent, style, ...props }: PictogramProps) {
  return <MdBadge style={{ color: accent, ...style }} {...props} />;
}
