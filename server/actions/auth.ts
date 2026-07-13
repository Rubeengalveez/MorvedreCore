"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAccessRequestNotification } from "@/lib/email/resend";

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
    fullName: z.string().min(2, "Introduce tu nombre completo."),
    role: z.enum(["player", "parent"], {
      message: "Selecciona un tipo de cuenta.",
    }),
    birthYear: z.preprocess(
      (val: unknown) => (val ? Number(val) : undefined),
      z.number().min(1900).max(2100).optional(),
    ),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    relation: z.enum(["mother", "father", "legal_guardian", "other"]).optional(),
    childrenIds: z.string().optional(),
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

const searchChildrenSchema = z.object({
  query: z.string().trim().min(5, "Escribe el nombre completo."),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
});

export type PasswordResetState = { error?: string; success?: boolean } | null;
export type UpdatePasswordState = { error?: string } | null;
export type SubmitAccessRequestState = { error?: string; success?: boolean } | null;
export interface IssuedCredential {
  email: string;
  temporaryPassword: string;
}

export type AccessRequestActionState = {
  error?: string;
  success?: boolean;
  credentials?: IssuedCredential[];
} | null;
export type SearchChildrenState = {
  children?: { id: string; full_name: string; birth_year: number | null }[];
  error?: string;
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

function normalizeFullName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function parseChildrenIds(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Array.from(
        new Set(
          parsed.filter(
            (id): id is string => typeof id === "string" && z.string().uuid().safeParse(id).success,
          ),
        ),
      ).slice(0, 10);
    }
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((id) => z.string().uuid().safeParse(id).success)
      .slice(0, 10);
  }
  return [];
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
  return (emailCount ?? 0) >= 3 || (globalCount ?? 0) >= 50;
}

async function findCandidateProfile(fullName: string, birthYear: number) {
  const supabase = createAdminClient();
  const normalized = normalizeFullName(fullName);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, birth_year")
    .eq("birth_year", birthYear)
    .limit(50);

  const exactMatches = (profiles ?? []).filter(
    (profile) => normalizeFullName(profile.full_name) === normalized,
  );

  if (exactMatches.length === 1) {
    return {
      candidate: exactMatches[0],
      candidates: [] as { id: string; full_name: string; birth_year: number | null }[],
    };
  }

  const similar = (profiles ?? [])
    .filter((profile) => normalizeFullName(profile.full_name).includes(normalized))
    .slice(0, 5);

  return { candidate: null, candidates: similar };
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
    const admin = createAdminClient();

    const { data: pendingRequest } = await admin
      .from("access_requests")
      .select("id")
      .ilike("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRequest) {
      redirect(buildLoginErrorUrl(next, "pending_request"));
    }

    const existingAuth = await findAuthUserByEmail(email);
    const { data: existingProfile } = existingAuth
      ? await admin
          .from("profiles")
          .select("id, auth_user_id")
          .eq("auth_user_id", existingAuth.id)
          .maybeSingle()
      : await admin
          .from("profiles")
          .select("id, auth_user_id")
          .ilike("email_contact", email)
          .maybeSingle();

    if (existingProfile?.auth_user_id) {
      redirect(buildLoginErrorUrl(next, "invalid_credentials"));
    }

    const params = new URLSearchParams();
    if (next && next !== "/dashboard") params.set("next", next);
    params.set("email", email);
    redirect(`/login/request?${params.toString()}` as Route);
  }

  const signInAdmin = createAdminClient();
  const { data: profile } = await signInAdmin
    .from("profiles")
    .select("must_change_password")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    const params = new URLSearchParams();
    params.set("email", email);
    redirect(`/login/request?${params.toString()}` as Route);
  }

  const target = profile.must_change_password ? "/change-password" : next;
  redirect(target as Route);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login" as Route);
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
  const rawChildren = formData.get("childrenIds");
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
    childrenIds: typeof rawChildren === "string" ? rawChildren : undefined,
  };

  const parsed = submitAccessRequestSchema.safeParse(rawFields);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { email, fullName, role, birthYear, gender, relation } = parsed.data;
  const childrenIds = parseChildrenIds(parsed.data.childrenIds);

  if (role === "parent" && childrenIds.length === 0) {
    return { error: "Selecciona al menos a un hijo/a." };
  }

  const admin = createAdminClient();

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

  let candidateProfileId: string | null = null;

  if (role === "player" && birthYear) {
    const { candidate } = await findCandidateProfile(fullName, birthYear);
    candidateProfileId = candidate?.id ?? null;
  }

  if (role === "parent") {
    const { data: children } = await admin
      .from("profiles")
      .select("id, auth_user_id, must_change_password")
      .in("id", childrenIds);

    const validChildren = (children ?? []).filter(
      (child) => child.auth_user_id && child.must_change_password === false,
    );

    if (validChildren.length !== childrenIds.length) {
      return {
        error:
          "Alguno de los hijos seleccionados no tiene una cuenta activada. Activa primero su cuenta.",
      };
    }
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
    }
  }

  await sendAdminAccessRequestNotification({ email, fullName, role });

  return { success: true };
}

export async function getAccessRequests(status?: "pending" | "approved" | "activated") {
  try {
    await requireCurrentAdminProfile();
  } catch {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
    .from("access_requests")
    .select(
      "*, candidate:profiles!candidate_profile_id(id, full_name), children:access_request_children(child_profile_id, child:profiles!child_profile_id(id, full_name))",
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

  if (request.role !== "player" && request.role !== "parent") {
    return { error: "Los roles internos se asignan desde la gestión de personal." };
  }

  const tempPassword = generateTemporaryPassword();
  let authUserId: string | null = null;
  let createdAuthUser = false;

  try {
    const existingAuth = await findAuthUserByEmail(request.email);

    if (existingAuth) {
      const { data: linkedProfile } = await adminUser
        .from("profiles")
        .select("id")
        .eq("auth_user_id", existingAuth.id)
        .maybeSingle();

      if (
        linkedProfile &&
        (!request.candidate_profile_id || linkedProfile.id !== request.candidate_profile_id)
      ) {
        return { error: "Ese email ya esta vinculado a otra cuenta del club." };
      }

      const { error: updateAuthError } = await adminUser.auth.admin.updateUserById(
        existingAuth.id,
        {
          password: tempPassword,
        },
      );
      if (updateAuthError) {
        console.error("[approveAccessRequest] update auth password error:", updateAuthError);
        return { error: "No pudimos preparar la cuenta de acceso." };
      }
      authUserId = existingAuth.id;
    } else {
      const { data: newAuth, error: createAuthError } = await adminUser.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
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
        .select("id, auth_user_id")
        .eq("id", request.candidate_profile_id)
        .single();

      if (candidate?.auth_user_id) {
        throw new Error("El perfil candidato ya está vinculado a otra cuenta.");
      }

      const { error: updateProfileError } = await adminUser
        .from("profiles")
        .update({
          auth_user_id: authUserId,
          email_contact: request.email,
          must_change_password: true,
          gender: request.gender ?? undefined,
        })
        .eq("id", request.candidate_profile_id);

      if (updateProfileError) {
        throw new Error("No se pudo vincular el perfil existente.");
      }

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
          must_change_password: true,
        })
        .select()
        .single();

      if (insertProfileError || !newProfile) {
        throw new Error("No se pudo crear el perfil.");
      }

      profileId = newProfile.id;
    }

    const { error: roleError } = await adminUser.from("user_roles").upsert(
      {
        profile_id: profileId,
        role: request.role,
        scope_team_id: null,
      },
      { onConflict: "profile_id,role,scope_team_id" },
    );

    if (roleError) {
      throw new Error("No se pudo asignar el rol.");
    }

    if (request.role === "parent" && request.children && request.children.length > 0) {
      const links = request.children.map((child) => ({
        parent_profile_id: profileId,
        child_profile_id: child.child_profile_id,
        relation: request.relation ?? "other",
      }));
      const { error: parentLinkError } = await adminUser.from("parent_child_links").insert(links);
      if (parentLinkError) {
        throw new Error("No se pudo vincular a los hijos.");
      }
    }

    const { error: statusError } = await adminUser
      .from("access_requests")
      .update({
        status: "approved",
        approved_by_profile_id: adminProfile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (statusError) {
      throw new Error("No se pudo actualizar el estado de la solicitud.");
    }

    return {
      success: true,
      credentials: [{ email: request.email, temporaryPassword: tempPassword }],
    };
  } catch (err) {
    if (createdAuthUser && authUserId) {
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

  try {
    await requireCurrentAdminProfile();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No tienes permisos." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("access_requests").delete().eq("id", parsed.data);

  if (error) {
    console.error("[rejectAccessRequest] error:", error);
    return { error: "No pudimos rechazar la solicitud." };
  }

  return { success: true };
}

export async function searchChildrenProfiles(input: unknown): Promise<SearchChildrenState> {
  const parsed = searchChildrenSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Búsqueda inválida." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, birth_year")
    .not("auth_user_id", "is", null)
    .eq("must_change_password", false)
    .eq("birth_year", parsed.data.birthYear)
    .ilike("full_name", parsed.data.query.replace(/\s+/g, " ").trim())
    .order("full_name")
    .limit(3);

  if (error) {
    console.error("[searchChildrenProfiles] error:", error);
    return { error: "No pudimos buscar hijos." };
  }

  return { children: data ?? [] };
}
