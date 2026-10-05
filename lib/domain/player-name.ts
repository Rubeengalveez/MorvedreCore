export function playerNameVariants(name: string) {
  const words = name.trim().split(/\s+/);
  const full = words.join(" ");
  if (words.length < 2) return [full];
  if (words.length === 2) return [full, `${words[0]} ${words[1][0]}.`];
  const given = words.slice(0, -2).join(" ");
  return [
    ...new Set([
      full,
      `${given} ${words.at(-2)} ${words.at(-1)![0]}.`,
      `${given} ${words.at(-2)![0]}. ${words.at(-1)![0]}.`,
      ...(words.length > 3 ? [`${words[0]} ${words.at(-2)![0]}. ${words.at(-1)![0]}.`] : []),
    ]),
  ];
}

export function fitPlayerName(name: string, width: number, measure: (text: string) => number) {
  const variants = playerNameVariants(name);
  const fit = variants.find((text) => measure(text) <= width);
  if (fit !== undefined) return fit;
  const letters = Array.from(variants.at(-1) ?? "");
  while (letters.length && measure(`${letters.join("")}…`) > width) letters.pop();
  return measure("…") <= width ? `${letters.join("").trimEnd()}…` : "";
}
