import { MdCampaign } from "react-icons/md";
import type { PictogramProps } from "./types";

export function Megafone({ accent, style, ...props }: PictogramProps) {
  return <MdCampaign style={{ color: accent, ...style }} {...props} />;
}
