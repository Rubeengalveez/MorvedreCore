import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ActaQuarterMarks } from "@/components/matches/acta-quarter-marks";

afterEach(cleanup);

it("distingue cuartos jugados, descanso y selección actual sin anticipar futuros", () => {
  const view = render(<ActaQuarterMarks played={[1]} period={2} compact />);
  const marks = view.container.querySelector("[data-acta-quarter-marks]")!;
  expect(marks).toHaveTextContent("1");
  expect(marks.textContent).not.toContain("2");
  expect(marks.querySelectorAll("svg")).toHaveLength(1);
  view.rerender(<ActaQuarterMarks played={[1]} period={2} current compact />);
  expect(marks).toHaveTextContent("12");
  expect(marks.lastElementChild).toHaveClass("bg-pool-blue");
});

it("en la tabla solo muestra cuartos jugados y el actual en juego", () => {
  const view = render(<ActaQuarterMarks played={[1, 3]} period={4} edge />);
  const marks = view.container.querySelector("[data-acta-quarter-marks]")!;
  expect(marks).toHaveTextContent("13");
  expect(marks.querySelectorAll("svg")).toHaveLength(0);
  view.rerender(<ActaQuarterMarks played={[1, 3]} period={4} current edge />);
  expect(marks).toHaveTextContent("134");
  expect(marks.lastElementChild).toHaveClass("bg-pool-blue");
});

it("no presenta cuartos sin datos como descansos confirmados", () => {
  const view = render(<ActaQuarterMarks played={[]} known={[]} period={2} compact />);
  const marks = view.container.querySelector("[data-acta-quarter-marks]")!;
  expect(marks).toHaveTextContent("?");
  expect(marks.querySelectorAll("svg")).toHaveLength(1);
});
