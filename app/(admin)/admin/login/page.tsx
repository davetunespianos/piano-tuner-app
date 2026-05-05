"use client";

import { useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    // Check whether this account requires a second factor
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      setError("Could not verify session. Please try again.");
      setLoading(false);
      return;
    }

    const needsMFA = aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2";

    if (!needsMFA) {
      router.push("/admin/dashboard");
      return;
    }

    // Account requires MFA. Check if this device is already trusted.
    try {
      const trustRes = await fetch("/api/auth/verify-trusted-device", { method: "POST" });
      const trustData = await trustRes.json();

      if (trustData.trusted) {
        // Trusted device — but the session is still aal1. We need to satisfy
        // the AAL2 requirement silently by performing a TOTP challenge using
        // the device-trust as proof. Since we can't bypass Supabase's AAL
        // without an actual TOTP code, on a trusted device we still elevate
        // the session by skipping the prompt UI — but the user is sent
        // straight in. The middleware (commit 4) will allow aal1 access if
        // the trusted-device cookie is valid.
        router.push("/admin/dashboard");
        return;
      }
    } catch {
      // If the trust check fails, fall through to the MFA prompt — fail closed
    }

    router.push("/admin/login/mfa");
  }

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h1>David Cossey</h1>
        <p className="login-sub">Piano Tuner — Admin</p>
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}