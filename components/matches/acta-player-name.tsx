"use client";

import { useEffect, useRef, useState } from "react";

export function ActaPlayerName({ name }: { name: string }) {
  const container = useRef<HTMLSpanElement>(null);
  const [choice, setChoice] = useState(0);
  const words = name.trim().split(/\s+/);
  const given = words.slice(0, -2).join(" ");
  const variants =
    words.length >= 3
      ? [
          name,
          `${given} ${words.at(-2)} ${words.at(-1)![0]}.`,
          `${given} ${words.at(-2)![0]}. ${words.at(-1)![0]}.`,
          ...(words.length > 3 ? [`${words[0]} ${words.at(-2)![0]}. ${words.at(-1)![0]}.`] : []),
        ]
      : words.length === 2
        ? [name, `${words[0]} ${words[1][0]}.`]
        : [name];
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const update = () => {
      const widths = Array.from(node.querySelectorAll<HTMLElement>("[data-name-measure]"));
      const fit = widths.findIndex(
        (item) => item.getBoundingClientRect().width <= node.clientWidth,
      );
      setChoice(fit < 0 ? widths.length - 1 : fit);
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener("resize", update);
    update();
    const fontsReady = document.fonts?.ready;
    if (fontsReady && typeof fontsReady.then === "function") void fontsReady.then(update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [name]);
  return (
    <span ref={container} title={name} aria-label={name} className="relative block w-full min-w-0">
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
        {variants[choice] ?? name}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-0 left-0 h-0 overflow-hidden"
      >
        {variants.map((text) => (
          <span key={text} data-name-measure className="block w-max whitespace-nowrap">
            {text}
          </span>
        ))}
      </span>
    </span>
  );
}
