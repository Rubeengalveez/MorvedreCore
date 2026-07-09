import { MdHome } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Inicio({ accent, style, ...props }: PictogramProps) {
  return <MdHome style={{ color: accent, ...style }} {...props} />;
}
