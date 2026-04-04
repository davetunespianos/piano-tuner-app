import { createServerSupabaseClient } from "./supabase-server";

export async function getGoogleAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .limit(1)
    .single();

  if (!data) return null;

  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
    return data.access_token;
  }

  if (!data.refresh_token) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await response.json();

  if (tokens.error) return null;

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("google_tokens")
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt,
    })
    .eq("access_token", data.access_token);

  return tokens.access_token;
}