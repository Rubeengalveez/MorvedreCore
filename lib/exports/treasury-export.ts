import * as XLSX from "xlsx";

import { formatTreasuryCents } from "@/lib/domain/treasury";
import type { TreasuryClosure, TreasuryLine } from "@/server/queries/treasury";

export function buildTreasuryClosureWorkbook(input: {
  closure: TreasuryClosure;
  lines: TreasuryLine[];
}): Buffer {
  const rows = input.lines.map((line) => ({
    Perfil: line.profile_name,
    Concepto: line.description,
    Importe: line.amount_cents / 100,
    "Importe texto": formatTreasuryCents(line.amount_cents),
    Pagado: line.paid ? "Si" : "No",
    "Fecha pago": line.paid_at ?? "",
    Metodo: line.payment_method ?? "",
  }));
  rows.push({
    Perfil: "",
    Concepto: "TOTAL",
    Importe: input.closure.total_cents / 100,
    "Importe texto": formatTreasuryCents(input.closure.total_cents),
    Pagado: "",
    "Fecha pago": "",
    Metodo: "",
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Cierre");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function treasuryClosureFilename(periodLabel: string): string {
  const safeLabel = periodLabel.replace(/[^a-z0-9-]+/gi, "_").toLowerCase();
  return `tesoreria_${safeLabel}.xlsx`;
}
