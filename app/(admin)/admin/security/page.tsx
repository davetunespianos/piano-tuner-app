"use client";

import AdminHeader from "../AdminHeader";
import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";

type FactorStatus = "loading" | "none" | "enrolled" | "enrolling";

export default function SecurityPage() {
  const router = useRouter();
  const [status, setStatus] = useState<FactorStatus>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        loadFactors();
      }
    });
  }, [router]);

  async function loadFactors() {
    const supabase = createClient();
    const { data, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(listErr.message);
      setStatus("none");
      return;
    }
    const verified = (data.totp || []).filter((f: any) => f.status === "verified");
    if (verified.length > 0) {
      setEnrolledFactorId(verified[0].id);
      setStatus("enrolled");
    } else {
      setStatus("none");
    }
  }

  async function startEnrollment() {
    setError("");
    setBusy(true);
    const supabase = createClient();

    // Clean up any leftover unverified factors first to avoid the "factor already exists" issue
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const dangling = (existing?.all || []).filter((f: any) => f.factor_type === "totp" && f.status === "unverified");
    for (const f of dangling) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (enrollErr || !data) {
      setError(enrollErr?.message || "Could not start enrollment.");
      setBusy(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp?.qr_code || null);
    setSecret(data.totp?.secret || null);
    setStatus("enrolling");
    setBusy(false);
  }

  async function verifyEnrollment() {
    if (!factorId || verifyCode.trim().length !== 6) {
      setError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    setBusy(true);
    const supabase = createClient();

    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: verifyCode.trim(),
    });

    if (verifyErr) {
      setError(verifyErr.message);
      setBusy(false);
      return;
    }

    setVerifyCode("");
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setBusy(false);
    await loadFactors();
  }

  async function cancelEnrollment() {
    setError("");
    setBusy(true);
    const supabase = createClient();
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
    setStatus("none");
    setBusy(false);
  }

  async function disableMFA() {
    if (!enrolledFactorId) return;
    if (!confirm("Disable two-factor authentication? You'll be asked to set it up again next time you sign in.")) return;
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId });
    if (unenrollErr) {
      setError(unenrollErr.message);
      setBusy(false);
      return;
    }
    setEnrolledFactorId(null);
    setStatus("none");
    setBusy(false);
  }

  if (status === "loading") return <div className="admin-loading">Loading...</div>;

  return (
    <div className="admin-wrapper">
      <AdminHeader title="Security" />
      <div className="admin-content" style={{ maxWidth: "700px" }}>

        <div className="record-section">
          <div className="record-section-header">
            <h2>Two-Factor Authentication</h2>
          </div>

          {status === "enrolled" && (
            <>
              <p style={{ fontSize: "0.95rem", color: "#2e7d32", fontWeight: 600, marginBottom: "1rem" }}>
                Two-factor authentication is enabled.
              </p>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1.5rem" }}>
                You'll be asked for a code from your authenticator app when signing in from a new device or browser.
                Trusted devices won't be re-prompted for 30 days.
              </p>
              <button onClick={disableMFA} disabled={busy} className="admin-btn-danger">
                {busy ? "Disabling..." : "Disable Two-Factor Authentication"}
              </button>
            </>
          )}

          {status === "none" && (
            <>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1.5rem" }}>
                Add a second factor to your sign-in. After enabling, you'll be asked for a 6-digit code from your
                authenticator app (such as 2FAS, Google Authenticator, or Authy) when signing in.
              </p>
              <button onClick={startEnrollment} disabled={busy} className="admin-btn">
                {busy ? "Starting..." : "Enable Two-Factor Authentication"}
              </button>
            </>
          )}

          {status === "enrolling" && (
            <>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
                <strong>Step 1:</strong> Open your authenticator app (2FAS) and scan this QR code, or paste the secret manually.
              </p>

              {qrCode && (
                <div
                  style={{ background: "#fff", padding: "1rem", display: "inline-block", marginBottom: "1rem" }}
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
              )}

              {secret && (
                <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem", wordBreak: "break-all" }}>
                  <strong>Manual entry secret:</strong> <code style={{ background: "#f4f4f4", padding: "0.2rem 0.4rem" }}>{secret}</code>
                </p>
              )}

              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem" }}>
                <strong>Step 2:</strong> Enter the 6-digit code from your app to verify.
              </p>

              <div className="form-field" style={{ maxWidth: "200px" }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  style={{ fontSize: "1.2rem", letterSpacing: "0.3rem", textAlign: "center" }}
                />
              </div>

              <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                <button onClick={cancelEnrollment} disabled={busy} className="admin-btn-outline">
                  Cancel
                </button>
                <button onClick={verifyEnrollment} disabled={busy || verifyCode.length !== 6} className="admin-btn">
                  {busy ? "Verifying..." : "Verify and Enable"}
                </button>
              </div>
            </>
          )}

          {error && <p className="form-error" style={{ marginTop: "1rem" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}