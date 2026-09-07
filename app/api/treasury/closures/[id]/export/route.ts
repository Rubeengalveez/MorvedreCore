import { NextResponse } from "next/server";

import { getTreasuryClosure } from "@/server/queries/treasury";
import { requirePermission } from "@/server/actions/admin/_helpers";
import { idSchema } from "@/lib/domain/admin-schemas";
import { captureException } from "@/lib/monitoring/error-logger";
import {
  buildTreasuryClosureWorkbook,
  treasuryClosureFilename,
} from "@/lib/exports/treasury-export";

export const dynamic = "force-dynamic";

function exportError(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("manage_treasury");
  } catch {
    return exportError(
      "No pudimos autorizar la descarga. Comprueba tu sesión y tus permisos de tesorería.",
      403,
    );
  }
  const parsed = idSchema.safeParse(await params);
  if (!parsed.success) return exportError("Identificador inválido.", 400);

  try {
    const { closure, lines } = await getTreasuryClosure(parsed.data.id);
    if (!closure) return exportError("No encontrado", 404);

    const buffer = buildTreasuryClosureWorkbook({ closure, lines });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${treasuryClosureFilename(closure.period_label)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    captureException(new Error("No se pudo generar la descarga del cierre de tesorería."), {
      route: "treasury-closure-export",
    });
    return exportError("No pudimos preparar el Excel completo. Inténtalo de nuevo.", 503);
  }
}
