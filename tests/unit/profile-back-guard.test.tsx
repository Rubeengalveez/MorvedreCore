import { cleanup, renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const router = { replace };
import { useProfileBackGuard } from "@/components/profile/use-profile-back-guard";
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/profile/edit");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});
it("el gesto Atrás abre la revisión sin abandonar ni perder el formulario", () => {
  const onBack = vi.fn();
  renderHook(() => useProfileBackGuard(onBack));
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(onBack).toHaveBeenCalledOnce();
  expect(replace).not.toHaveBeenCalled();
  expect(window.location.pathname).toBe("/profile/edit");
});
it("una salida autorizada retira la entrada de protección antes de cambiar de página", () => {
  const back = vi
    .spyOn(window.history, "back")
    .mockImplementation(() => window.dispatchEvent(new PopStateEvent("popstate")));
  const onBack = vi.fn();
  const { result } = renderHook(() => useProfileBackGuard(onBack));
  act(() => result.current("/profile"));
  expect(back).toHaveBeenCalledOnce();
  expect(replace).toHaveBeenCalledWith("/profile");
  expect(onBack).not.toHaveBeenCalled();
});
it("no intercepta historial de otras pantallas", () => {
  const onBack = vi.fn();
  renderHook(() => useProfileBackGuard(onBack));
  window.history.replaceState(null, "", "/team");
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(onBack).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});
