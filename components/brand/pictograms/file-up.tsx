import { MdUploadFile } from "react-icons/md";
import type { PictogramProps } from "./types";

export function FileUp({ accent, style, ...props }: PictogramProps) {
  return <MdUploadFile style={{ color: accent, ...style }} {...props} />;
}
