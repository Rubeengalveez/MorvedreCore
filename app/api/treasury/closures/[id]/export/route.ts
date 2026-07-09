import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { getTreasuryClosure } from "@/server/queries/treasury";
import { formatTreasuryCents } from "@/lib/domain/treasury";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  return !!data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { closure, lines } = await getTreasuryClosure(id);
  if (!closure) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const rows = lines.map((line) => ({
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
    Importe: closure.total_cents / 100,
    "Importe texto": formatTreasuryCents(closure.total_cents),
    Pagado: "",
    "Fecha pago": "",
    Metodo: "",
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Cierre");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const safeLabel = closure.period_label.replace(/[^a-z0-9-]+/gi, "_").toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tesoreria_${safeLabel}.xlsx"`,
    },
  });
}
