import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { verifyTrustedDeviceToken, TRUSTED_DEVICE_COOKIE } from "../../../../lib/trusted-device";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ trusted: false }, { status: 401 });
    }

    const token = request.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ trusted: false });
    }

    const ok = await verifyTrustedDeviceToken(token, user.id);
    return NextResponse.json({ trusted: ok });
  } catch (error: any) {
    console.error("verify-trusted-device error:", error);
    return NextResponse.json({ trusted: false, error: error.message }, { status: 500 });
  }
}