import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyTrustedDeviceToken, TRUSTED_DEVICE_COOKIE } from "./lib/trusted-device";

const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/login/mfa",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce on /admin/* routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow login pages through without checks
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Check whether this user has MFA factors and whether the session has satisfied them
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // currentLevel: aal1 (password only) | aal2 (password + TOTP)
  // nextLevel: highest level the account is required to reach
  // If currentLevel === nextLevel, the session is fully authenticated
  if (aalData && aalData.currentLevel === aalData.nextLevel) {
    return response;
  }

  // Session is below required level. Check for a valid trusted-device cookie.
  const trustedToken = request.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (trustedToken) {
    const trusted = await verifyTrustedDeviceToken(trustedToken, user.id);
    if (trusted) {
      return response;
    }
  }

  // Not trusted, MFA required. Send to challenge page.
  return NextResponse.redirect(new URL("/admin/login/mfa", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};