import { MdSportsVolleyball } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Balon({ accent, style, ...props }: PictogramProps) {
  return <MdSportsVolleyball style={{ color: accent, ...style }} {...props} />;
}
