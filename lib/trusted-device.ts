import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "trusted_device";
const COOKIE_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function issueTrustedDeviceToken(userId: string): Promise<string> {
  const expSeconds = Math.floor(Date.now() / 1000) + COOKIE_DAYS * 24 * 60 * 60;
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(getSecret());
}

export async function verifyTrustedDeviceToken(token: string, expectedUserId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.sub !== expectedUserId) return false;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export const TRUSTED_DEVICE_COOKIE = COOKIE_NAME;
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = COOKIE_DAYS * 24 * 60 * 60;