import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ADMIN_EMAIL = 'galvillo9@gmail.com';
const ADMIN_FULL_NAME = 'Rubén Gálvez';
const ADMIN_TEMP_PASSWORD = 'MorvedreTemporal2026!';

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

async function findUserIdByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const match = data.users.find(
    (u) => u.email && u.email.toLowerCase() === email.toLowerCase(),
  );
  return match ? match.id : null;
}

async function ensureAuthUser(email, password) {
  const existingId = await findUserIdByEmail(email);
  if (existingId) {
    console.log(`[auth] Usuario ya existe: ${email} (${existingId})`);
    return existingId;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`[auth] Usuario creado: ${email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfile(authUserId, fullName) {
  const { data, error } = await admin
    .from('profiles')
    .upsert(
      {
        auth_user_id: authUserId,
        full_name: fullName,
        must_change_password: true,
      },
      { onConflict: 'auth_user_id' },
    )
    .select('id')
    .single();
  if (error) throw error;
  console.log(`[profile] Listo: ${data.id}`);
  return data.id;
}

async function ensureAdminRole(profileId) {
  const { error } = await admin
    .from('user_roles')
    .upsert(
      {
        profile_id: profileId,
        role: 'admin',
        scope_team_id: null,
        granted_by: null,
      },
      { onConflict: 'profile_id,role,scope_team_id' },
    );
  if (error) throw error;
  console.log(`[role] admin asignado a ${profileId}`);
}

async function main() {
  console.log(`[bootstrap] Iniciando para ${ADMIN_EMAIL}`);
  const authUserId = await ensureAuthUser(ADMIN_EMAIL, ADMIN_TEMP_PASSWORD);
  const profileId = await ensureProfile(authUserId, ADMIN_FULL_NAME);
  await ensureAdminRole(profileId);
  console.log('');
  console.log('Bootstrap completado.');
  console.log('  Email:    ' + ADMIN_EMAIL);
  console.log('  Password: ' + ADMIN_TEMP_PASSWORD);
  console.log('  Acción:   cambia la contraseña en el primer login.');
}

main().catch((err) => {
  console.error('[bootstrap] ERROR:', err.message || err);
  process.exit(1);
});
