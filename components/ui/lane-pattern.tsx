import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface LanePatternProps {
  children?: React.ReactNode;
  className?: string;
  strong?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

export function LanePattern({ children, className, strong = false, as = "div" }: LanePatternProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp className={cn("relative isolate overflow-hidden", className)}>
      <span
        aria-hidden="true"
        data-lane-pattern
        className={strong ? "lane-pattern-strong" : "lane-pattern"}
      />
      {children ? <div className="relative z-[1]">{children}</div> : null}
    </Comp>
  );
}
