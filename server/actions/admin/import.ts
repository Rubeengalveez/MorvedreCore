"use server";

import { revalidatePath } from "next/cache";
import { read, utils } from "xlsx";

import { xlsxRowSchema, RELATION_VALUES } from "@/lib/domain/import-schema";

import { requireAdmin } from "./_helpers";
import { createAdminClient } from "@/lib/supabase/admin";

type Relation = (typeof RELATION_VALUES)[number];

export type PreviewRow = {
  rowNumber: number;
  full_name: string;
  birth_year: number;
  squad_number: number | null;
  team_label: string | null;
  parent_email: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  relation: Relation;
};

export type ImportError = {
  rowNumber: number;
  message: string;
  full_name: string | null;
};

export type ImportPreview = {
  totalRows: number;
  preview: PreviewRow[];
  errors: ImportError[];
};

export type ImportResult = {
  created: number;
  skipped: number;
  errors: ImportError[];
};

function readFile(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No se ha enviado ningún archivo.");
  }
  if (file.size === 0) {
    throw new Error("El archivo está vacío.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El archivo no puede superar 5 MB.");
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error("El archivo debe ser XLSX, XLS o CSV.");
  }
  return file;
}

type ParsedFileResult = {
  rows: PreviewRow[];
  errors: ImportError[];
};

async function parseFile(formData: FormData): Promise<ParsedFileResult> {
  const file = readFile(formData);
  const arrayBuffer = await file.arrayBuffer();
  const workbook = read(arrayBuffer, { type: "array", sheetRows: 2001 });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo no contiene hojas.");
  }
  const sheet = workbook.Sheets[sheetName];
  const raw = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  if (raw.length > 2000) {
    throw new Error("El archivo no puede contener más de 2000 filas.");
  }

  const currentYear = new Date().getFullYear();
  const rows: PreviewRow[] = [];
  const errors: ImportError[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const rowNumber = i + 2;
    const fullNameRaw = r["nombre_completo"];
    const fullNameStr = typeof fullNameRaw === "string" ? fullNameRaw.trim() : null;

    const parsed = xlsxRowSchema(currentYear).safeParse(r);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((iss) => `${iss.path.join(".") || "fila"}: ${iss.message}`)
        .join("; ");
      errors.push({
        rowNumber,
        message: issues,
        full_name: fullNameStr && fullNameStr !== "" ? fullNameStr : null,
      });
      continue;
    }
    const data = parsed.data;
    if (!data.nombre_completo || data.ano_nacimiento == null) continue;
    rows.push({
      rowNumber,
      full_name: data.nombre_completo,
      birth_year: data.ano_nacimiento,
      squad_number: data.dorsal ?? null,
      team_label: data.nombre_equipo ?? null,
      parent_email: data.email_tutor ?? null,
      parent_name: data.nombre_tutor ?? null,
      parent_phone: data.telefono_tutor ?? null,
      relation: data.relacion,
    });
  }
  return { rows, errors };
}

export async function previewImport(formData: FormData): Promise<ImportPreview> {
  await requireAdmin();

  const { rows, errors } = await parseFile(formData);

  return {
    totalRows: rows.length,
    preview: rows.slice(0, 10),
    errors,
  };
}

export async function commitImport(formData: FormData): Promise<ImportResult> {
  await requireAdmin();

  const { rows, errors: parseErrors } = await parseFile(formData);
  const supabase = createAdminClient();
  const result: ImportResult = { created: 0, skipped: 0, errors: [...parseErrors] };

  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  const teamCache = new Map<string, string | null>();
  async function getTeamId(label: string | null): Promise<string | null> {
    if (!label || !currentSeason) return null;
    if (teamCache.has(label)) return teamCache.get(label) ?? null;
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("season_id", currentSeason.id)
      .eq("label", label)
      .maybeSingle();
    const id = data?.id ?? null;
    teamCache.set(label, id);
    return id;
  }

  const parentCache = new Map<string, string | null>();
  async function getOrCreateParentId(
    email: string,
    fullName: string | null,
  ): Promise<string | null> {
    if (parentCache.has(email)) return parentCache.get(email) ?? null;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email_contact", email)
      .limit(1);
    let id: string | null = existing && existing.length > 0 ? existing[0]!.id : null;
    if (!id) {
      const name = fullName?.trim() || email.split("@")[0]!;
      const { data: created, error } = await supabase
        .from("profiles")
        .insert({
          full_name: name,
          email_contact: email,
          must_change_password: false,
        })
        .select("id")
        .single();
      if (error || !created) {
        parentCache.set(email, null);
        return null;
      }
      id = created.id;
    }
    parentCache.set(email, id);
    return id;
  }

  for (const r of rows) {
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", r.full_name)
        .eq("birth_year", r.birth_year)
        .limit(1);

      let playerId: string;
      if (existing && existing.length > 0) {
        playerId = existing[0]!.id;
        result.skipped += 1;
      } else {
        const { data: created, error } = await supabase
          .from("profiles")
          .insert({
            full_name: r.full_name,
            birth_year: r.birth_year,
            must_change_password: false,
          })
          .select("id")
          .single();
        if (error || !created) {
          result.errors.push({
            rowNumber: r.rowNumber,
            message: error?.message ?? "No pudimos crear el perfil.",
            full_name: r.full_name,
          });
          continue;
        }
        playerId = created.id;
        result.created += 1;
      }

      if (r.team_label) {
        const teamId = await getTeamId(r.team_label);
        if (teamId) {
          const { error: rosterError } = await supabase.from("team_rosters").upsert(
            {
              team_id: teamId,
              player_id: playerId,
              squad_number: r.squad_number ?? null,
            },
            { onConflict: "team_id,player_id" },
          );
          if (rosterError && rosterError.code !== "23505") {
            result.errors.push({
              rowNumber: r.rowNumber,
              message: `Roster: ${rosterError.message}`,
              full_name: r.full_name,
            });
          }
        }
      }

      if (r.parent_email) {
        const parentId = await getOrCreateParentId(r.parent_email, r.parent_name);
        if (parentId) {
          const { error: linkError } = await supabase.from("parent_child_links").upsert(
            {
              parent_profile_id: parentId,
              child_profile_id: playerId,
              relation: r.relation,
            },
            { onConflict: "parent_profile_id,child_profile_id" },
          );
          if (linkError && linkError.code !== "23505") {
            result.errors.push({
              rowNumber: r.rowNumber,
              message: `Vínculo familiar: ${linkError.message}`,
              full_name: r.full_name,
            });
          }
        }
      }
    } catch (err) {
      result.errors.push({
        rowNumber: r.rowNumber,
        message: err instanceof Error ? err.message : "Error desconocido.",
        full_name: r.full_name,
      });
    }
  }

  revalidatePath("/admin/players");
  revalidatePath("/admin/families");
  revalidatePath("/admin/teams");

  return result;
}
