import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ParentDecisionForm } from "@/app/(app)/shop/parents/pending/_components/parent-decision-form";

const { decideShopOrderMock, refreshMock } = vi.hoisted(() => ({
  decideShopOrderMock: vi.fn().mockResolvedValue(undefined),
  refreshMock: vi.fn(),
}));

vi.mock("@/server/actions/admin/shop", () => ({
  decideShopOrder: decideShopOrderMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const orderId = "550e8400-e29b-41d4-a716-446655440000";

describe("ParentDecisionForm", () => {
  beforeEach(() => {
    decideShopOrderMock.mockClear();
    decideShopOrderMock.mockResolvedValue(undefined);
    refreshMock.mockClear();
  });

  it("reuses the phone already stored in the parent profile", async () => {
    render(<ParentDecisionForm orderId={orderId} initialPhone="+34611111111" />);

    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(decideShopOrderMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tu teléfono para Sol")).toHaveValue("+34611111111");
    fireEvent.click(screen.getByRole("button", { name: "Aprobar pedido" }));

    await waitFor(() =>
      expect(decideShopOrderMock).toHaveBeenCalledWith({
        order_id: orderId,
        decision: "approve",
        contact_phone: "+34611111111",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Decisión guardada");
  });

  it("asks once for the approving parent's phone and sends it normalized", async () => {
    render(<ParentDecisionForm orderId={orderId} initialPhone={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    expect(decideShopOrderMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Tu teléfono para Sol"), {
      target: { value: "612 345 678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aprobar pedido" }));

    await waitFor(() =>
      expect(decideShopOrderMock).toHaveBeenCalledWith({
        order_id: orderId,
        decision: "approve",
        contact_phone: "+34612345678",
      }),
    );
  });
});
