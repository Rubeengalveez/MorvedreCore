"use client";

import { useEffect, useRef } from "react";
import { playerNameVariants } from "@/lib/domain/player-name";

export function ShopPersonName({ name, className = "" }: { name: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const fit = () => {
      if (!context) return;
      element.style.fontSize = "";
      const style = getComputedStyle(element);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const variants = playerNameVariants(name);
      const width = element.getBoundingClientRect().width;
      const fitted = variants.find((text) => context.measureText(text).width <= width);
      element.textContent = fitted ?? variants.at(-1) ?? name;
      element.style.fontSize = fitted
        ? ""
        : `${Math.max(12, (parseFloat(style.fontSize) * width) / Math.max(context.measureText(variants.at(-1) ?? name).width, 1))}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    void document.fonts?.ready.then(fit);
    fit();
    return () => observer.disconnect();
  }, [name]);
  return (
    <span className={`block min-w-0 flex-1 overflow-hidden whitespace-nowrap ${className}`}>
      <span className="sr-only">{name}</span>
      <span
        ref={ref}
        title={name}
        aria-hidden="true"
        className="block w-full overflow-hidden whitespace-nowrap"
      >
        {name}
      </span>
    </span>
  );
}
