import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const fallback = getSafeRedirectPath(nextParam, "/dashboard");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        const target = profile?.must_change_password
          ? "/change-password"
          : fallback;

        return NextResponse.redirect(`${origin}${target}`);
      }

      return NextResponse.redirect(`${origin}${fallback}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`);
}
