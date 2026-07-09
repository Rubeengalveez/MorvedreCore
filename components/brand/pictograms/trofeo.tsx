import { MdEmojiEvents } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Trofeo({ accent, style, ...props }: PictogramProps) {
  return <MdEmojiEvents style={{ color: accent, ...style }} {...props} />;
}
