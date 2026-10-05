"use client";
import { ActaGuardSheet, type ActaGuardSheetProps } from "@/components/matches/acta-guard-sheet";
export function ShopDecisionSheet(
  props: Omit<ActaGuardSheetProps, "context"> & { context?: string },
) {
  return <ActaGuardSheet context="TIENDA" {...props} />;
}
