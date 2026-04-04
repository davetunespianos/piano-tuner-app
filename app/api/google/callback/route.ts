import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/dashboard?error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/dashboard?error=token_error`);
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase.from("google_tokens").select("id").limit(1);

  if (existing && existing.length > 0) {
    await supabase.from("google_tokens").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
    }).eq("id", existing[0].id);
  } else {
    await supabase.from("google_tokens").insert([{
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
    }]);
  }

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/dashboard?connected=true`);
}
