import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import xlsxPkg from 'xlsx';

const { readFile, utils: xlsxUtils } = xlsxPkg;

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Faltan variables: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
  );
  console.error('Define ambas en .env.local antes de ejecutar este script.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CATEGORY_LABELS = {
  benjamin: 'Benjamín',
  alevin: 'Alevín',
  infantil: 'Infantil',
  cadete: 'Cadete',
  juvenil: 'Juvenil',
  absoluto: 'Absoluto',
  escuela: 'Escuela',
};

const RELATION_VALUES = ['mother', 'father', 'legal_guardian', 'other'];

function inferCategory(birthYear, currentYear) {
  if (birthYear > currentYear) {
    throw new Error(
      `birthYear (${birthYear}) cannot be in the future (currentYear: ${currentYear})`,
    );
  }
  if (birthYear < currentYear - 25) {
    throw new Error(
      `birthYear (${birthYear}) is too old for the roster (currentYear: ${currentYear})`,
    );
  }
  const age = currentYear - birthYear;
  if (age <= 11) return 'benjamin';
  if (age <= 13) return 'alevin';
  if (age <= 15) return 'infantil';
  if (age <= 17) return 'cadete';
  if (age <= 19) return 'juvenil';
  return 'absoluto';
}

function emptyToUndefined(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
}

function makeRowSchema(currentYear) {
  return z.object({
    nombre_completo: z
      .string({ invalid_type_error: 'nombre_completo debe ser texto' })
      .trim()
      .min(1, 'nombre_completo es obligatorio'),
    ano_nacimiento: z.coerce
      .number({ invalid_type_error: 'ano_nacimiento debe ser numérico' })
      .int('ano_nacimiento debe ser un entero')
      .gte(currentYear - 25, `ano_nacimiento debe ser >= ${currentYear - 25}`)
      .lte(currentYear + 1, `ano_nacimiento debe ser <= ${currentYear + 1}`),
    dorsal: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: 'dorsal debe ser numérico' })
        .int('dorsal debe ser entero')
        .min(0, 'dorsal debe ser >= 0')
        .max(99, 'dorsal debe ser <= 99')
        .optional(),
    ),
    email_tutor: z.preprocess(
      emptyToUndefined,
      z
        .string({ invalid_type_error: 'email_tutor debe ser texto' })
        .trim()
        .email('email_tutor no es un email válido')
        .optional(),
    ),
    nombre_tutor: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional(),
    ),
    telefono_tutor: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional(),
    ),
    relacion: z.enum(RELATION_VALUES).default('legal_guardian'),
    nombre_equipo: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional(),
    ),
  });
}

function normalizeRow(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      out[key] = undefined;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      out[key] = trimmed === '' ? undefined : trimmed;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function isRowEmpty(row) {
  return Object.values(row).every((v) => v === undefined);
}

function isRowIncomplete(row) {
  return row.nombre_completo === undefined || row.ano_nacimiento === undefined;
}

async function getCurrentSeason() {
  const { data, error } = await admin
    .from('seasons')
    .select('id, label, start_date, end_date')
    .eq('is_current', true)
    .limit(1)
    .single();
  if (error || !data) {
    throw new Error(
      `No se encontró temporada activa (is_current=true): ${error?.message ?? 'sin resultados'}`,
    );
  }
  return data;
}

async function findPlayerByNameAndYear(fullName, birthYear) {
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('full_name', fullName)
    .eq('birth_year', birthYear)
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function findParentByEmail(email) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email_contact')
    .eq('email_contact', email)
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function findTeamByLabel(label, seasonId) {
  const { data, error } = await admin
    .from('teams')
    .select('id, label, category_code, color, gender')
    .eq('season_id', seasonId)
    .eq('label', label)
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function createPlayerProfile({ fullName, birthYear }) {
  const { data, error } = await admin
    .from('profiles')
    .insert({
      auth_user_id: null,
      full_name: fullName,
      birth_year: birthYear,
      must_change_password: false,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function assignPlayerRole(profileId) {
  const { error } = await admin
    .from('user_roles')
    .upsert(
      { profile_id: profileId, role: 'player', scope_team_id: null },
      { onConflict: 'profile_id,role,scope_team_id' },
    );
  if (error) throw error;
}

async function assignToTeam({ teamId, playerId, squadNumber }) {
  const { error } = await admin
    .from('team_rosters')
    .upsert(
      {
        team_id: teamId,
        player_id: playerId,
        squad_number: squadNumber ?? null,
      },
      { onConflict: 'team_id,player_id' },
    );
  if (error) throw error;
}

async function linkParent({ parentId, childId, relation }) {
  const { error } = await admin
    .from('parent_child_links')
    .upsert(
      { parent_profile_id: parentId, child_profile_id: childId, relation },
      { onConflict: 'parent_profile_id,child_profile_id' },
    );
  if (error) throw error;
}

async function processRow(rawRow, rowNumber, ctx) {
  const row = normalizeRow(rawRow);

  if (isRowEmpty(row)) {
    return { status: 'empty' };
  }

  if (isRowIncomplete(row)) {
    return { status: 'incomplete' };
  }

  const parsed = ctx.rowSchema.safeParse(row);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'fila'}: ${i.message}`)
      .join('; ');
    return { status: 'error', reason: issues, name: row.nombre_completo };
  }

  const data = parsed.data;

  const existing = await findPlayerByNameAndYear(
    data.nombre_completo,
    data.ano_nacimiento,
  );
  if (existing) {
    return { status: 'duplicate', name: data.nombre_completo };
  }

  let category;
  try {
    category = inferCategory(data.ano_nacimiento, ctx.currentYear);
  } catch (err) {
    return {
      status: 'error',
      reason: `categoría: ${err.message || err}`,
      name: data.nombre_completo,
    };
  }

  const profileId = await createPlayerProfile({
    fullName: data.nombre_completo,
    birthYear: data.ano_nacimiento,
  });
  await assignPlayerRole(profileId);

  if (data.nombre_equipo) {
    const team = await findTeamByLabel(data.nombre_equipo, ctx.season.id);
    if (team) {
      await assignToTeam({
        teamId: team.id,
        playerId: profileId,
        squadNumber: data.dorsal,
      });
    } else {
      console.log(
        `    ⚠ Equipo "${data.nombre_equipo}" no existe en temporada ${ctx.season.label}, saltando asignación`,
      );
    }
  }

  if (data.email_tutor) {
    const parent = await findParentByEmail(data.email_tutor);
    if (parent) {
      await linkParent({
        parentId: parent.id,
        childId: profileId,
        relation: data.relacion,
      });
    } else {
      console.log(
        `    ⚠ Tutor not found, skipping parent assignment (${data.email_tutor})`,
      );
    }
  }

  return {
    status: 'created',
    name: data.nombre_completo,
    year: data.ano_nacimiento,
    category: CATEGORY_LABELS[category],
    team: data.nombre_equipo || null,
    dorsal: data.dorsal ?? null,
    tutor: data.email_tutor || null,
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/import-players.mjs <ruta-al-excel>');
    process.exit(1);
  }

  const absPath = resolve(process.cwd(), filePath);
  if (!existsSync(absPath)) {
    console.error(`No se encontró el archivo: ${absPath}`);
    process.exit(1);
  }

  console.log(`[import-players] Archivo: ${absPath}`);

  const workbook = readFile(absPath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.error('El archivo no contiene hojas.');
    process.exit(1);
  }

  const rawRows = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
    raw: true,
  });
  console.log(
    `[import-players] Hoja: ${sheetName} (${rawRows.length} filas leídas)`,
  );

  const season = await getCurrentSeason();
  const currentYear = new Date(season.end_date).getFullYear();
  console.log(
    `[import-players] Temporada activa: ${season.label} (año de referencia: ${currentYear})`,
  );
  console.log('');

  const ctx = {
    season,
    currentYear,
    rowSchema: makeRowSchema(currentYear),
  };

  let created = 0;
  let duplicates = 0;
  let empty = 0;
  let incomplete = 0;
  let errors = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    try {
      const result = await processRow(rawRows[i], rowNumber, ctx);
      if (result.status === 'created') {
        created++;
        const teamInfo = result.team
          ? ` → ${result.team}${result.dorsal !== null ? ` (dorsal ${result.dorsal})` : ''}`
          : '';
        const tutorInfo = result.tutor ? ` · tutor: ${result.tutor}` : '';
        console.log(
          `  [fila ${rowNumber}] ✓ ${result.name} (${result.year}) → ${result.category}${teamInfo}${tutorInfo}`,
        );
      } else if (result.status === 'duplicate') {
        duplicates++;
        console.log(
          `  [fila ${rowNumber}] = Duplicado: ${result.name} (mismo nombre y año ya existen)`,
        );
      } else if (result.status === 'empty') {
        empty++;
      } else if (result.status === 'incomplete') {
        incomplete++;
        console.log(
          `  [fila ${rowNumber}] - Incompleta: falta nombre_completo o ano_nacimiento`,
        );
      } else if (result.status === 'error') {
        errors++;
        console.log(
          `  [fila ${rowNumber}] ✗ Error${result.name ? ` (${result.name})` : ''}: ${result.reason}`,
        );
      }
    } catch (err) {
      errors++;
      console.log(
        `  [fila ${rowNumber}] ✗ Excepción: ${err.message || err}`,
      );
    }
  }

  console.log('');
  console.log('--- Resumen ---');
  console.log(
    `${created} creados, ${duplicates} omitidos (duplicados), ${errors} errores`,
  );
  if (empty > 0 || incomplete > 0) {
    console.log(
      `  + ${empty} filas vacías, ${incomplete} filas incompletas saltadas`,
    );
  }
}

main().catch((err) => {
  console.error('[import-players] ERROR fatal:', err.message || err);
  process.exit(1);
});
