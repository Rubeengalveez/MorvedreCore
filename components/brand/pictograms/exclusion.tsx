import { MdBlock } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Exclusion({ accent, style, ...props }: PictogramProps) {
  return <MdBlock style={{ color: accent, ...style }} {...props} />;
}
