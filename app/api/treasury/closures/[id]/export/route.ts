import { NextResponse } from "next/server";

import { getTreasuryClosure } from "@/server/queries/treasury";
import { hasAdminAccess } from "@/server/actions/admin/_helpers";
import {
  buildTreasuryClosureWorkbook,
  treasuryClosureFilename,
} from "@/lib/exports/treasury-export";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { closure, lines } = await getTreasuryClosure(id);
  if (!closure) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = buildTreasuryClosureWorkbook({ closure, lines });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${treasuryClosureFilename(closure.period_label)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
