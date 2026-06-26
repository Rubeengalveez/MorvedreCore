"use server";

import { revalidatePath } from "next/cache";
import { read, utils } from "xlsx";
import { z } from "zod";

import { requireAdmin } from "./_helpers";
import { createClient } from "@/lib/supabase/server";
import { rosterPlayer } from "./teams";
import { linkParentChild } from "./players";

const RELATION_VALUES = ["mother", "father", "legal_guardian", "other"] as const;
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

export type ImportPreview = {
  totalRows: number;
  preview: PreviewRow[];
  errors: Array<{ rowNumber: number; message: string; full_name: string | null }>;
};

export type ImportResult = {
  created: number;
  skipped: number;
  errors: Array<{ rowNumber: number; message: string; full_name: string | null }>;
};

const rowSchema = z.object({
  nombre_completo: z.string().trim().min(1),
  ano_nacimiento: z.coerce.number().int(),
  dorsal: z.preprocess(
    (v) => (v == null || v === "" ? undefined : Number(v)),
    z.coerce.number().int().min(0).max(99).optional(),
  ),
  nombre_equipo: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().optional(),
  ),
  email_tutor: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().email().optional(),
  ),
  nombre_tutor: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().optional(),
  ),
  telefono_tutor: z.preprocess(
    (v) => (v == null || v === "" ? undefined : String(v).trim()),
    z.string().optional(),
  ),
  relacion: z.preprocess(
    (v) => {
      if (v == null || v === "") return "legal_guardian";
      const lower = String(v).toLowerCase().trim();
      if (RELATION_VALUES.includes(lower as Relation)) return lower;
      return "legal_guardian";
    },
    z.enum(RELATION_VALUES),
  ),
});

type ParsedRow = z.infer<typeof rowSchema>;

function readFile(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No se ha enviado ningún archivo.");
  }
  return file;
}

async function parseFile(formData: FormData): Promise<PreviewRow[]> {
  const file = readFile(formData);
  const arrayBuffer = await file.arrayBuffer();
  const workbook = read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo no contiene hojas.");
  }
  const sheet = workbook.Sheets[sheetName];
  const raw = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  const out: PreviewRow[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const rowNumber = i + 2;
    const parsed = rowSchema.safeParse(r);
    if (!parsed.success) continue;
    const data: ParsedRow = parsed.data;
    if (!data.nombre_completo || data.ano_nacimiento == null) continue;
    out.push({
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
  return out;
}

export async function previewImport(formData: FormData): Promise<ImportPreview> {
  await requireAdmin();

  const rows = await parseFile(formData);
  const errors: ImportPreview["errors"] = [];

  for (const r of rows) {
    if (r.birth_year < 1900 || r.birth_year > 2100) {
      errors.push({
        rowNumber: r.rowNumber,
        message: "Año de nacimiento fuera de rango (1900-2100).",
        full_name: r.full_name,
      });
    }
  }

  return {
    totalRows: rows.length,
    preview: rows.slice(0, 10),
    errors,
  };
}

export async function commitImport(formData: FormData): Promise<ImportResult> {
  await requireAdmin();

  const rows = await parseFile(formData);
  const supabase = await createClient();
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

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
          try {
            await rosterPlayer({
              team_id: teamId,
              player_id: playerId,
              squad_number: r.squad_number ?? undefined,
            });
          } catch {
            // ignore duplicate rosters
          }
        }
      }

      if (r.parent_email) {
        const parentId = await getOrCreateParentId(r.parent_email, r.parent_name);
        if (parentId) {
          try {
            await linkParentChild({
              parent_profile_id: parentId,
              child_profile_id: playerId,
              relation: r.relation,
            });
          } catch {
            // ignore duplicate links
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
