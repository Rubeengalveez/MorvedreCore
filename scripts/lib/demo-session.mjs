import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function createDemoSession() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey)
    throw new Error("Faltan credenciales de Supabase para la sesión de demo.");
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "admin.demo@morvedre-core.test",
  });
  if (error || !data?.properties?.hashed_token)
    throw error ?? new Error("No se pudo crear la sesión de demo.");
  const jar = new Map();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((cookie) => jar.set(cookie.name, cookie)),
    },
  });
  const verified = await client.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verified.error) throw verified.error;
  return {
    client,
    cookies: [...jar.values()].map(({ name, value, options }) => ({
      name,
      value,
      domain: "localhost",
      path: options?.path ?? "/",
      httpOnly: options?.httpOnly,
      sameSite:
        options?.sameSite === "strict" ? "Strict" : options?.sameSite === "none" ? "None" : "Lax",
      secure: false,
    })),
  };
}
