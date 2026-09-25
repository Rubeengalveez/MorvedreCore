"use server";

import { createHmac, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAccessRequestNotification } from "@/lib/email/resend";
import { findUniqueExactProfile, findUniqueFlexiblePlayer, normalizeFullName, requiresTemporaryPassword } from "@/lib/domain/access-onboarding";

const signInSchema = z.object({
  email: z.string().email("Introduce un email válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

const emailSchema = z.object({
  email: z.string().email("Introduce un email válido."),
});

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

const updatePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, "Mínimo 10 caracteres.")
      .regex(PASSWORD_REGEX, "La contraseña debe tener al menos una letra y un número."),
    confirmPassword: z.string().min(1, "Confirma la contraseña."),
  })
  .refine(
    (data: { newPassword: string; confirmPassword: string }) =>
      data.newPassword === data.confirmPassword,
    {
      message: "Las contraseñas no coinciden.",
      path: ["confirmPassword"],
    },
  );

const submitAccessRequestSchema = z
  .object({
    email: z.string().email("Introduce un email válido."),
    fullName: z.string().trim().min(2, "Introduce tu nombre completo.").max(100, "Máximo 100 caracteres."),
    role: z.enum(["player", "parent"], {
      message: "Selecciona un tipo de cuenta.",
    }),
    birthYear: z.preprocess(
      (val: unknown) => (val ? Number(val) : undefined),
      z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    ),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    relation: z.enum(["mother", "father", "other"]).optional(),
    children: z.string().optional(),
  })
  .refine(
    (data: { role: string; birthYear?: number }) => {
      if (data.role === "player" && !data.birthYear) {
        return false;
      }
      return true;
    },
    {
      message: "El año de nacimiento es obligatorio para jugadores.",
      path: ["birthYear"],
    },
  )
  .refine(
    (data: { role: string; relation?: string }) => {
      if (data.role === "parent" && !data.relation) {
        return false;
      }
      return true;
    },
    {
      message: "Selecciona la relación con tus hijos.",
      path: ["relation"],
    },
  );

const accessRequestIdSchema = z.string().uuid("Identificador de solicitud inválido.");

export type PasswordResetState = { error?: string; success?: boolean } | null;
export type UpdatePasswordState = { error?: string } | null;
export type SubmitAccessRequestState = { error?: string; success?: boolean; accessMethod?: "google" | "email" } | null;
export interface IssuedCredential {
  email: string;
  temporaryPassword: string;
}

export type AccessRequestActionState = {
  error?: string;
  success?: boolean;
  credentials?: IssuedCredential[];
} | null;
function getSafeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function buildLoginErrorUrl(next: string | undefined, errorCode: string) {
  const params = new URLSearchParams();
  if (next && next !== "/dashboard") params.set("next", next);
  params.set("error", errorCode);
  return `/login?${params.toString()}` as Route;
}

const childClaimsSchema = z.array(z.object({
  fullName: z.string().trim().min(5).max(100),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
})).min(1).max(10);

function parseChildClaims(raw: string | undefined) {
  try {
    return childClaimsSchema.safeParse(JSON.parse(raw ?? "null"));
  } catch {
    return childClaimsSchema.safeParse(null);
  }
}

function generateTemporaryPassword(): string {
  return `Mc-${randomBytes(12).toString("base64url")}9aA`;
}

async function findAuthUserByEmail(email: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .rpc("get_auth_user_id_by_email", { p_email: email })
    .maybeSingle();

  if (error) {
    console.error("[findAuthUserByEmail] error:", error);
    return null;
  }
  return data ? { id: data } : null;
}

async function requireCurrentAdminProfile(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) {
    throw new Error("No pudimos verificar tu perfil.");
  }

  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  if (!adminRole) {
    throw new Error("No tienes permisos de administrador.");
  }

  return profile;
}

async function rateLimitCheck(email: string) {
  const supabase = createAdminClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: emailCount, error: emailError }, { count: globalCount, error: globalError }] =
    await Promise.all([
      supabase
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .ilike("email", email)
        .gte("created_at", oneDayAgo),
      supabase
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneHourAgo),
    ]);

  if (emailError || globalError) {
    console.error("[rateLimitCheck] error:", emailError ?? globalError);
    return true;
  }
  return (emailCount ?? 0) >= 3 || (globalCount ?? 0) >= 300;
}

async function consumeIdentityCheckBudget(): Promise<boolean> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip") || "unknown";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const fingerprint = createHmac("sha256", key).update(ip).digest("hex");
  const admin = createAdminClient();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const [{ count: perIp, error: ipError }, { count: global, error: globalError }] = await Promise.all([
    admin.from("access_identity_checks").select("id", { count: "exact", head: true })
      .eq("requester_hash", fingerprint).gte("checked_at", since),
    admin.from("access_identity_checks").select("id", { count: "exact", head: true })
      .gte("checked_at", since),
  ]);
  if (ipError || globalError || (perIp ?? 0) >= 30 || (global ?? 0) >= 1000) return false;
  const { error } = await admin.from("access_identity_checks").insert({ requester_hash: fingerprint });
  if (error) return false;
  await admin.from("access_identity_checks").delete()
    .lt("checked_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  return true;
}

async function findPlayerProfile(fullName: string, birthYear: number, allowLinked: boolean) {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin.from("profiles")
    .select("id, full_name, auth_user_id")
    .eq("birth_year", birthYear).eq("is_active", true).limit(300);
  if (error) return null;
  const candidate = findUniqueFlexiblePlayer(
    (profiles ?? []).filter((profile) => allowLinked || !profile.auth_user_id), fullName,
  );
  if (!candidate) return null;
  const [{ data: playerRole }, { data: season }] = await Promise.all([
    admin.from("user_roles").select("id").eq("profile_id", candidate.id)
      .eq("role", "player").is("scope_team_id", null).maybeSingle(),
    admin.from("seasons").select("id").eq("is_current", true).maybeSingle(),
  ]);
  if (!playerRole || !season) return null;
  const { data: rosters } = await admin.from("team_rosters")
    .select("team_id, team:teams!team_rosters_team_id_fkey(season_id)")
    .eq("player_id", candidate.id).is("left_at", null).limit(20);
  const currentRoster = rosters?.find((row) => row.team?.season_id === season.id);
  return currentRoster ? { id: candidate.id, teamId: currentRoster.team_id } : null;
}

export async function checkPlayerIdentity(input: unknown): Promise<"found" | "missing" | "limited"> {
  const parsed = z.object({
    fullName: z.string().trim().min(5).max(100),
    birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
    forParent: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return "missing";
  if (!await consumeIdentityCheckBudget()) return "limited";
  const match = await findPlayerProfile(parsed.data.fullName, parsed.data.birthYear, parsed.data.forParent);
  return match ? "found" : "missing";
}

export async function signIn(formData: FormData) {
  const rawEmail =
    typeof formData.get("email") === "string"
      ? (formData.get("email") as string).toLowerCase().trim()
      : "";
  const parsed = signInSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });

  const next = getSafeRedirectPath(formData.get("next"), "/dashboard");

  if (!parsed.success) {
    redirect(buildLoginErrorUrl(next, "invalid_credentials"));
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData.user) {
    redirect(buildLoginErrorUrl(next, "invalid_credentials"));
  }

  const signInAdmin = createAdminClient();
  const { data: profile } = await signInAdmin
    .from("profiles")
    .select("must_change_password")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login/request" as Route);
  }

  const target = profile.must_change_password ? "/change-password" : next;
  redirect(target as Route);
}

export async function signOut(input?: {
  endpoint?: string;
  localPushRemoved?: boolean;
}): Promise<{ error?: string }> {
  const parsed = z
    .object({
      endpoint: z.string().url().max(4096).optional(),
      localPushRemoved: z.boolean().optional(),
    })
    .safeParse(input ?? {});
  if (!parsed.success) return { error: "No pudimos comprobar los datos del dispositivo." };
  const supabase = await createClient();
  if (parsed.data.endpoint) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = user
      ? await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle()
      : null;
    const disabled = profile?.data
      ? await supabase
          .from("push_subscriptions")
          .update({ enabled: false })
          .eq("profile_id", profile.data.id)
          .eq("endpoint", parsed.data.endpoint)
          .select("id")
      : null;
    if ((!disabled || disabled.error || !disabled.data?.length) && !parsed.data.localPushRemoved) {
      return {
        error:
          "No pudimos desactivar los avisos de este dispositivo. Vuelve a intentarlo antes de salir.",
      };
    }
  }
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error)
    return { error: "No pudimos cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo." };
  return {};
}

export async function requestPasswordReset(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/api/auth/callback?next=/change-password`,
  });

  if (error) {
    return { error: "No pudimos enviar el email. Inténtalo de nuevo." };
  }

  return { success: true };
}

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = updatePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return { error: "No pudimos cambiar la contraseña. Inténtalo de nuevo." };
  }

  const profileAdmin = createAdminClient();
  const { error: profileError } = await profileAdmin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("auth_user_id", user.id);

  if (profileError) {
    return { error: "Contraseña cambiada, pero no pudimos actualizar el perfil." };
  }

  if (user.email) {
    await profileAdmin
      .from("access_requests")
      .update({ status: "activated" })
      .ilike("email", user.email)
      .eq("status", "approved");
  }

  redirect("/dashboard" as Route);
}

export async function submitAccessRequest(
  _prevState: SubmitAccessRequestState,
  formData: FormData,
): Promise<SubmitAccessRequestState> {
  const rawChildren = formData.get("children");
  const rawEmail =
    typeof formData.get("email") === "string"
      ? (formData.get("email") as string).toLowerCase().trim()
      : "";
  const rawFields = {
    email: rawEmail,
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    birthYear: formData.get("birthYear") || undefined,
    gender: formData.get("gender") || undefined,
    relation: formData.get("relation") || undefined,
    children: typeof rawChildren === "string" ? rawChildren : undefined,
  };

  const parsed = submitAccessRequestSchema.safeParse(rawFields);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { email, fullName, role, birthYear, gender, relation } = parsed.data;
  const parsedChildren = role === "parent" ? parseChildClaims(parsed.data.children) : null;
  if (role === "parent" && !parsedChildren?.success) {
    return { error: "Escribe el nombre completo y año de nacimiento de cada hijo." };
  }
  const childrenClaims = parsedChildren?.success ? parsedChildren.data : [];
  let childrenIds: string[] = [];
  if ((role === "player" || role === "parent") && !await consumeIdentityCheckBudget()) {
    return { error: "Has hecho demasiadas comprobaciones. Inténtalo más tarde o habla con el administrador." };
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const googleUserId = user?.email?.toLowerCase() === email && user.email_confirmed_at && user.identities?.some(
    (identity) => identity.provider === "google",
  ) ? user.id : null;

  if (await rateLimitCheck(email)) {
    return {
      error: "Has enviado demasiadas solicitudes. Inténtalo mañana o contacta con el club.",
    };
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email_contact", email)
    .not("auth_user_id", "is", null)
    .maybeSingle();

  if (existingProfile) {
    return { error: "Este email ya tiene una cuenta activa. Intenta iniciar sesión." };
  }
  const existingAuth = await findAuthUserByEmail(email);
  if (existingAuth && existingAuth.id !== googleUserId) {
    return { error: "Este correo ya está registrado. Entra con Google o recupera tu contraseña." };
  }
  if (googleUserId) {
    const { data: linkedProfile } = await admin.from("profiles")
      .select("id").eq("auth_user_id", googleUserId).maybeSingle();
    if (linkedProfile) return { error: "Esta cuenta ya tiene un perfil. Entra en la app." };
  }

  let candidateProfileId: string | null = null;
  let playerTeamId: string | null = null;

  if (role === "player" && birthYear) {
    const candidate = await findPlayerProfile(fullName, birthYear, false);
    if (!candidate) {
      return { error: "Revisa que el nombre esté bien escrito y completo y que el año de nacimiento sea correcto." };
    }
    candidateProfileId = candidate.id;
    playerTeamId = candidate.teamId;
  }

  if (role === "parent") {
    const { data: profiles } = await admin.from("profiles")
      .select("id, full_name, email_contact")
      .ilike("email_contact", email)
      .is("auth_user_id", null).eq("is_active", true).limit(20);
    const candidate = findUniqueExactProfile(
      (profiles ?? []).filter((profile) => profile.email_contact?.toLowerCase() === email), fullName,
    );
    if (candidate) candidateProfileId = candidate.id;
  }

  if (role === "parent") {
    for (const child of childrenClaims) {
      const childProfile = await findPlayerProfile(child.fullName, child.birthYear, true);
      if (!childProfile) {
        return { error: "Revisa que el nombre del jugador esté bien escrito y completo y que el año de nacimiento sea correcto." };
      }
      childrenIds.push(childProfile.id);
    }
    childrenIds = Array.from(new Set(childrenIds));
  }

  const { data: request, error: insertError } = await admin
    .from("access_requests")
    .insert({
      email,
      full_name: fullName,
      role,
      birth_year: birthYear ?? null,
      gender: gender ?? null,
      relation: relation ?? null,
      candidate_profile_id: candidateProfileId,
      auth_user_id: googleUserId,
      team_id: role === "player" ? playerTeamId : null,
    })
    .select()
    .single();

  if (insertError || !request) {
    console.error("[submitAccessRequest] insert error:", insertError);
    if (insertError?.code === "23505") {
      return { error: "Ya tienes una solicitud pendiente con este email." };
    }
    return { error: "No pudimos guardar la solicitud. Inténtalo de nuevo." };
  }

  if (role === "parent" && childrenIds.length > 0) {
    const links = childrenIds.map((childId) => ({
      request_id: request.id,
      child_profile_id: childId,
    }));
    const { error: linksError } = await admin.from("access_request_children").insert(links);
    if (linksError) {
      console.error("[submitAccessRequest] children links error:", linksError);
      await admin.from("access_requests").delete().eq("id", request.id);
      return { error: "No pudimos guardar los vínculos familiares. Inténtalo de nuevo." };
    }
  }

  const { data: adminRoles } = await admin.from("user_roles").select("profile_id")
    .eq("role", "admin").is("scope_team_id", null);
  const adminIds = Array.from(new Set((adminRoles ?? []).map((row) => row.profile_id)));
  if (adminIds.length) {
    const { error: notificationError } = await admin.from("notifications").insert(
      adminIds.map((recipientId) => ({
        recipient_id: recipientId,
        kind: "access_request",
        title: "Nueva solicitud de acceso",
        body: `${fullName} solicita acceso como ${role === "player" ? "jugador" : role === "parent" ? "familiar" : "personal"}.`,
        href: "/admin/access-requests",
      })),
    );
    if (notificationError) console.error("[submitAccessRequest] admin notification error:", notificationError);
  }
  const mail = await sendAdminAccessRequestNotification({ email, fullName, role });
  if (!mail.success) console.error("[submitAccessRequest] admin email notification error:", mail.error);

  return { success: true, accessMethod: googleUserId ? "google" : "email" };
}

export async function getAccessRequests(status?: "pending" | "approved" | "activated" | "rejected") {
  try {
    await requireCurrentAdminProfile();
  } catch {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
    .from("access_requests")
    .select(
      "*, candidate:profiles!candidate_profile_id(id, full_name), team:teams!access_requests_team_id_fkey(id, label), children:access_request_children(child_profile_id, child:profiles!child_profile_id(id, full_name))",
    )
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAccessRequests] error:", error);
    return [];
  }

  return data ?? [];
}

export async function approveAccessRequest(formData: FormData): Promise<AccessRequestActionState> {
  const parsed = accessRequestIdSchema.safeParse(formData.get("requestId"));
  if (!parsed.success) {
    return { error: "Solicitud inválida." };
  }

  let adminProfile: { id: string };
  try {
    adminProfile = await requireCurrentAdminProfile();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No tienes permisos." };
  }

  const adminUser = createAdminClient();

  const { data: request } = await adminUser
    .from("access_requests")
    .select("*, children:access_request_children(child_profile_id)")
    .eq("id", parsed.data)
    .eq("status", "pending")
    .single();

  if (!request) {
    return { error: "La solicitud no existe o ya ha sido gestionada." };
  }

  if (!["player", "parent", "staff"].includes(request.role)) {
    return { error: "Los roles internos se asignan desde la gestión de personal." };
  }
  if ((request.role === "player" || request.role === "staff") && !request.candidate_profile_id) {
    return { error: "Este acceso necesita un perfil creado previamente por el club." };
  }

  const tempPassword = requiresTemporaryPassword(request.auth_user_id) ? generateTemporaryPassword() : null;
  let authUserId: string | null = null;
  let createdAuthUser = false;
  let createdProfileId: string | null = null;
  let linkedExistingProfile = false;
  let originalProfile: { email_contact: string | null; must_change_password: boolean } | null = null;
  let insertedRole = false;
  let linkedChildren: string[] = [];

  try {
    const existingAuth = await findAuthUserByEmail(request.email);

    if (request.auth_user_id) {
      if (!existingAuth || existingAuth.id !== request.auth_user_id) {
        return { error: "La cuenta de Google ya no coincide con la solicitud." };
      }
      const { data: googleAuth, error: googleError } = await adminUser.auth.admin.getUserById(request.auth_user_id);
      if (googleError || !googleAuth.user?.email_confirmed_at ||
        !googleAuth.user.identities?.some((identity) => identity.provider === "google") ||
        googleAuth.user.email?.toLowerCase() !== request.email.toLowerCase()) {
        return { error: "No pudimos verificar la identidad de Google. Pide que envíen otra solicitud." };
      }
      const { data: linkedProfile } = await adminUser
        .from("profiles")
        .select("id")
        .eq("auth_user_id", request.auth_user_id)
        .maybeSingle();
      if (linkedProfile) return { error: "Esta cuenta de Google ya tiene un perfil vinculado." };
      authUserId = request.auth_user_id;
    } else {
      if (existingAuth) return { error: "Ese correo ya tiene una cuenta. Pide que accedan con Google o recuperen su contraseña." };
      const { data: newAuth, error: createAuthError } = await adminUser.auth.admin.createUser({
        email: request.email,
        password: tempPassword!,
        email_confirm: true,
      });
      if (createAuthError || !newAuth.user) {
        console.error("[approveAccessRequest] create auth user error:", createAuthError);
        return { error: "No pudimos crear la cuenta de acceso." };
      }
      authUserId = newAuth.user.id;
      createdAuthUser = true;
    }

    let profileId: string;

    if (request.candidate_profile_id) {
      const { data: candidate } = await adminUser
        .from("profiles")
        .select("id, auth_user_id, full_name, birth_year, is_active, email_contact, must_change_password")
        .eq("id", request.candidate_profile_id)
        .single();

      if (!candidate || candidate.auth_user_id || !candidate.is_active) {
        throw new Error("El perfil indicado ya no está disponible.");
      }
      if (request.role === "player"
        ? !findUniqueFlexiblePlayer([candidate], request.full_name)
        : normalizeFullName(candidate.full_name) !== normalizeFullName(request.full_name)) {
        throw new Error("El nombre ya no coincide con el perfil indicado.");
      }
      if (request.role !== "player" && candidate.email_contact?.toLowerCase() !== request.email.toLowerCase()) {
        throw new Error("El correo ya no coincide con el perfil indicado.");
      }
      if (request.role === "player" && candidate.birth_year !== request.birth_year) {
        throw new Error("Los datos del jugador ya no coinciden con su perfil.");
      }
      if (request.role === "player") {
        const { data: roster } = await adminUser.from("team_rosters").select("team_id")
          .eq("player_id", candidate.id).eq("team_id", request.team_id!)
          .is("left_at", null).maybeSingle();
        if (!roster) throw new Error("El jugador ya no figura en el equipo solicitado.");
      }
      originalProfile = {
        email_contact: candidate.email_contact,
        must_change_password: candidate.must_change_password,
      };

      const { data: updatedProfile, error: updateProfileError } = await adminUser
        .from("profiles")
        .update({
          auth_user_id: authUserId,
          email_contact: candidate.email_contact ?? request.email,
          must_change_password: !request.auth_user_id,
        })
        .eq("id", request.candidate_profile_id)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();

      if (updateProfileError || !updatedProfile) {
        throw new Error("No se pudo vincular el perfil existente.");
      }
      linkedExistingProfile = true;

      profileId = request.candidate_profile_id;
    } else {
      const { data: newProfile, error: insertProfileError } = await adminUser
        .from("profiles")
        .insert({
          auth_user_id: authUserId,
          full_name: request.full_name,
          birth_year: request.birth_year,
          gender: request.gender ?? undefined,
          email_contact: request.email,
          must_change_password: !request.auth_user_id,
        })
        .select()
        .single();

      if (insertProfileError || !newProfile) {
        throw new Error("No se pudo crear el perfil.");
      }

      profileId = newProfile.id;
      createdProfileId = newProfile.id;
    }

    if (request.role !== "staff") {
      const { data: existingRole } = await adminUser.from("user_roles").select("id")
        .eq("profile_id", profileId).eq("role", request.role).is("scope_team_id", null).maybeSingle();
      if (!existingRole) {
        const { error: roleError } = await adminUser.from("user_roles").insert({
          profile_id: profileId, role: request.role, scope_team_id: null,
        });
        if (roleError) throw new Error("No se pudo asignar el rol.");
        insertedRole = true;
      }
    } else {
      const { data: staffRoles } = await adminUser.from("user_roles").select("role")
        .eq("profile_id", profileId).in("role", ["coach", "delegate", "directiva", "admin"]);
      const { data: staffAssignments } = await adminUser.from("team_staff").select("team_id")
        .eq("profile_id", profileId).limit(1);
      if (!staffRoles?.length && !staffAssignments?.length) {
        throw new Error("El perfil no tiene un rol de personal autorizado.");
      }
    }

    if (request.role === "parent" && request.children && request.children.length > 0) {
      const childIds = request.children.map((child) => child.child_profile_id);
      const { data: existingLinks } = await adminUser.from("parent_child_links")
        .select("child_profile_id").eq("parent_profile_id", profileId).in("child_profile_id", childIds);
      const existingChildIds = new Set((existingLinks ?? []).map((link) => link.child_profile_id));
      const links = request.children.filter((child) => !existingChildIds.has(child.child_profile_id)).map((child) => ({
        parent_profile_id: profileId,
        child_profile_id: child.child_profile_id,
        relation: request.relation ?? "other",
      }));
      if (links.length) {
        const { error: parentLinkError } = await adminUser.from("parent_child_links").insert(links);
        if (parentLinkError) throw new Error("No se pudo vincular a los hijos.");
      }
      linkedChildren = links.map((link) => link.child_profile_id);
    }

    const { data: updatedRequest, error: statusError } = await adminUser
      .from("access_requests")
      .update({
        status: request.auth_user_id ? "activated" : "approved",
        approved_by_profile_id: adminProfile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", request.id).eq("status", "pending").select("id").maybeSingle();

    if (statusError || !updatedRequest) {
      throw new Error("No se pudo actualizar el estado de la solicitud.");
    }

    return {
      success: true,
      credentials: tempPassword ? [{ email: request.email, temporaryPassword: tempPassword }] : [],
    };
  } catch (err) {
    let canDeleteCreatedAuthUser = true;
    if (linkedChildren.length && request.candidate_profile_id) {
      await adminUser.from("parent_child_links").delete()
        .eq("parent_profile_id", request.candidate_profile_id).in("child_profile_id", linkedChildren);
    }
    if (insertedRole && request.candidate_profile_id) {
      await adminUser.from("user_roles").delete()
        .eq("profile_id", request.candidate_profile_id).eq("role", request.role).is("scope_team_id", null);
    }
    if (linkedExistingProfile && request.candidate_profile_id && originalProfile) {
      const { data: restoredProfile, error: restoreError } = await adminUser.from("profiles")
        .update({ auth_user_id: null, ...originalProfile })
        .eq("id", request.candidate_profile_id).eq("auth_user_id", authUserId!)
        .select("id").maybeSingle();
      if (restoreError || !restoredProfile) {
        canDeleteCreatedAuthUser = false;
        console.error("[approveAccessRequest] could not restore linked profile:", restoreError);
      }
    }
    if (createdProfileId) {
      await adminUser.from("parent_child_links").delete().eq("parent_profile_id", createdProfileId);
      await adminUser.from("user_roles").delete().eq("profile_id", createdProfileId);
      await adminUser.from("profiles").delete().eq("id", createdProfileId);
    }
    if (createdAuthUser && authUserId && canDeleteCreatedAuthUser) {
      await adminUser.auth.admin.deleteUser(authUserId).catch((e) => {
        console.error("[approveAccessRequest] rollback deleteUser error:", e);
      });
    }

    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[approveAccessRequest] error:", err);
    return { error: message };
  }
}

export async function approveAccessRequestsBulk(
  formData: FormData,
): Promise<AccessRequestActionState> {
  const raw = formData.get("requestIds");
  if (typeof raw !== "string") {
    return { error: "No se seleccionó ninguna solicitud." };
  }

  let ids: string[] = [];
  try {
    ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return { error: "Formato inválido." };
  } catch {
    return { error: "Formato inválido." };
  }

  let approved = 0;
  const errors: string[] = [];
  const credentials: IssuedCredential[] = [];

  for (const id of ids) {
    const fd = new FormData();
    fd.append("requestId", id);
    const result = await approveAccessRequest(fd);
    if (result?.success) {
      approved++;
      credentials.push(...(result.credentials ?? []));
    } else if (result?.error) {
      errors.push(result.error);
    }
  }

  if (approved === 0 && errors.length > 0) {
    return { error: errors[0] };
  }

  return { success: true, credentials };
}

export async function rejectAccessRequest(formData: FormData): Promise<AccessRequestActionState> {
  const parsed = accessRequestIdSchema.safeParse(formData.get("requestId"));
  if (!parsed.success) {
    return { error: "Solicitud inválida." };
  }

  let adminProfile: { id: string };
  try {
    adminProfile = await requireCurrentAdminProfile();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No tienes permisos." };
  }

  const admin = createAdminClient();
  const { data: rejected, error } = await admin.from("access_requests")
    .update({ status: "rejected", rejected_at: new Date().toISOString(),
      rejected_by_profile_id: adminProfile.id })
    .eq("id", parsed.data).eq("status", "pending").select("id").maybeSingle();

  if (error || !rejected) {
    console.error("[rejectAccessRequest] error:", error);
    return { error: "No pudimos rechazar la solicitud." };
  }

  return { success: true };
}
