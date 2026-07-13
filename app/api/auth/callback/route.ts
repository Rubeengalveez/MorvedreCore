import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getSafeRedirectPath(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function classifyCallbackError(error: {
  message?: string;
  code?: string;
  status?: number;
}): string {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (msg.includes("redirect") || msg.includes("uri") || code === "redirect_uri_mismatch") {
    return "callback_redirect_uri";
  }
  if (msg.includes("expired") || msg.includes("invalid") || code === "otp_expired") {
    return "callback_code_expired";
  }
  if (code === "validation_failed" || msg.includes("validation")) {
    return "callback_validation";
  }
  return "callback";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error_description") || searchParams.get("error");
  const nextParam = searchParams.get("next");
  const fallback = getSafeRedirectPath(nextParam, "/dashboard");

  if (errorParam) {
    const reason = errorParam.toLowerCase().includes("redirect")
      ? "callback_redirect_uri"
      : "callback_google";
    console.error("[auth/callback] Google devolvio error:", errorParam);
    return NextResponse.redirect(`${origin}/login?error=${reason}&provider=google`);
  }

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("must_change_password")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!profile) {
          const params = new URLSearchParams();
          params.set("email", user.email || "");
          params.set("provider", "google");
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login/request?${params.toString()}`);
        }

        const target = profile.must_change_password ? "/change-password" : fallback;
        return NextResponse.redirect(`${origin}${target}`);
      }

      return NextResponse.redirect(`${origin}${fallback}`);
    }

    console.error("[auth/callback] exchangeCodeForSession fallo:", error);
    const reason = classifyCallbackError(error);
    return NextResponse.redirect(`${origin}/login?error=${reason}&provider=google`);
  }

  return NextResponse.redirect(`${origin}/login?error=callback&provider=google`);
}
