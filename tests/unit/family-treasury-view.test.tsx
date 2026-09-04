import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FamilyTreasuryView } from "@/app/(app)/treasury/_components/family-treasury-view";
import type { FamilyTreasury } from "@/server/queries/treasury";

const data: FamilyTreasury = {
  canView: true,
  totalPendingCents: 6000,
  currentPeriod: { label: "Junio 2026", start: "2026-06-01" },
  children: [
    {
      profile_id: "00000000-0000-4000-8000-000000000001",
      profile_name: "Rubén Gálvez Álvarez",
      photo_url: null,
      team_label: "Absoluto",
      team_color: "#0A2E5C",
      monthly_fee_cents: 6000,
    },
  ],
  monthlyFeeTotalCents: 6000,
  siblingDiscountCents: 0,
  discountedFeesCents: 6000,
  shopOrdersTotalCents: 0,
  shopOrders: [],
  olderDebtTotalCents: 0,
  olderDebts: [],
};

describe("FamilyTreasuryView", () => {
  it("labels the fee as the account holder's own fee for a non-parent account", () => {
    render(<FamilyTreasuryView data={data} isParent={false} />);

    expect(screen.getByRole("heading", { name: "Tu cuota" })).toBeInTheDocument();
    expect(screen.queryByText("Cuotas de tus hijos")).not.toBeInTheDocument();
  });

  it("keeps the family label for a parent account", () => {
    render(<FamilyTreasuryView data={data} isParent />);

    expect(screen.getByRole("heading", { name: "Cuotas de tus hijos" })).toBeInTheDocument();
  });
});
