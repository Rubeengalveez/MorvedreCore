import type { CSSProperties } from "react";

export function actaSanctionStyle(count: number, red: boolean, limit: number): CSSProperties {
  if (red || count >= limit)
    return { backgroundColor: "#fee2e2", color: "#7f1d1d", borderColor: "#b91c1c" };
  if (count === limit - 1)
    return { backgroundColor: "#ffedd5", color: "#7c2d12", borderColor: "#9a3f00" };
  if (count > 1) return { backgroundColor: "#fde68a", color: "#4e3600", borderColor: "#947000" };
  if (count === 1) return { backgroundColor: "#fff0bd", color: "#4e3600", borderColor: "#947000" };
  return { backgroundColor: "#ffffff", color: "#062048", borderColor: "#062048" };
}
