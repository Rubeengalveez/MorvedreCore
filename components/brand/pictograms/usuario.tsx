import { MdPerson } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Usuario({ accent, style, ...props }: PictogramProps) {
  return <MdPerson style={{ color: accent, ...style }} {...props} />;
}
