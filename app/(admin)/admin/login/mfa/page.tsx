"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLoginMFA() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) {
        setError("Could not load authentication factors.");
        setInitializing(false);
        return;
      }

      const verified = (factors.totp || []).find((f: any) => f.status === "verified");
      if (!verified) {
        // No factor — shouldn't be here. Send to dashboard.
        router.push("/admin/dashboard");
        return;
      }

      setFactorId(verified.id);
      setInitializing(false);
    })();
  }, [router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || code.trim().length !== 6) {
      setError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });

    if (verifyErr) {
      setError("Invalid code. Please try again.");
      setLoading(false);
      setCode("");
      return;
    }

    // Set the 30-day trusted device cookie
    try {
      await fetch("/api/auth/trust-device", { method: "POST" });
    } catch {
      // If cookie fails, login still proceeds — they'll just be prompted again next time
    }

    router.push("/admin/dashboard");
  }

  async function handleCancel() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (initializing) {
    return (
      <div className="login-wrapper">
        <div className="login-box">
          <p className="login-sub">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h1>Two-Factor Authentication</h1>
        <p className="login-sub">Enter the 6-digit code from your authenticator app.</p>
        <form onSubmit={handleVerify}>
          <div className="login-field">
            <label htmlFor="code">Authentication Code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
              autoComplete="one-time-code"
              style={{ fontSize: "1.3rem", letterSpacing: "0.4rem", textAlign: "center" }}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify and Sign In"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              marginTop: "0.75rem",
              width: "100%",
              padding: "0.5rem",
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel and sign out
          </button>
        </form>
      </div>
    </div>
  );
}