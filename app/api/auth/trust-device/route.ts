import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { issueTrustedDeviceToken, TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_MAX_AGE_SECONDS } from "../../../../lib/trusted-device";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Confirm the session is at AAL2 — meaning the user actually completed MFA
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== "aal2") {
      return NextResponse.json({ error: "MFA not completed for this session" }, { status: 403 });
    }

    const token = await issueTrustedDeviceToken(user.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set(TRUSTED_DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error: any) {
    console.error("trust-device error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}