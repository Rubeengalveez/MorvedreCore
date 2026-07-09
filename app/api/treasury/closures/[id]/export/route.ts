import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getTreasuryClosure } from "@/server/queries/treasury";
import {
  buildTreasuryClosureWorkbook,
  treasuryClosureFilename,
} from "@/lib/exports/treasury-export";

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

  const buffer = buildTreasuryClosureWorkbook({ closure, lines });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${treasuryClosureFilename(closure.period_label)}"`,
    },
  });
}
