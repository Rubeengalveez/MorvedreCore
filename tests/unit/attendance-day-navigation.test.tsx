import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceDatePicker } from "@/components/attendance/attendance-day-navigation";
const state = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }) }));
afterEach(cleanup);
beforeEach(() => state.replace.mockReset());
describe("Fecha para pasar lista", () => {
  it("cambia de día sin perder el origen ni añadir entradas al historial", () => {
    render(
      <AttendanceDatePicker
        selectedDay="2026-09-30"
        isToday={false}
        origin="calendar"
        calendarContext="calendarMonth=2026-09&calendarDay=2026-09-02"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver el día siguiente" }));
    expect(state.replace).toHaveBeenCalledWith(
      "/attendance?date=2026-10-01&from=calendar&calendarMonth=2026-09&calendarDay=2026-09-02",
      { scroll: false },
    );
  });
  it("aplica la fecha elegida una vez y permite cerrar sin navegar", () => {
    render(<AttendanceDatePicker selectedDay="2026-09-02" isToday={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Elegir fecha/ }));
    fireEvent.input(screen.getByLabelText("Fecha"), { target: { value: "2026-10-25" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver entrenamientos" }));
    expect(state.replace).toHaveBeenCalledWith("/attendance?date=2026-10-25", { scroll: false });
    state.replace.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Elegir fecha/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(state.replace).not.toHaveBeenCalled();
  });
});
