import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/auth/request-origin";

function getSafeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getAppOrigin(request);
  const next = getSafeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const reason = classifyError(error);
    return NextResponse.redirect(`${origin}/login?error=${reason}&provider=google`);
  }

  if (!data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_no_url&provider=google`);
  }

  return NextResponse.redirect(data.url);
}

function classifyError(error: { message?: string; code?: string; status?: number }): string {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (
    error.status === 400 ||
    msg.includes("provider") ||
    msg.includes("not enabled") ||
    msg.includes("unsupported") ||
    code === "validation_failed"
  ) {
    return "oauth_provider_disabled";
  }
  if (msg.includes("redirect") || msg.includes("url")) {
    return "oauth_redirect_uri";
  }
  return "oauth";
}
