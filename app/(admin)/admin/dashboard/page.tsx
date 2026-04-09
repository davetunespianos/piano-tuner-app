"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const connError = searchParams.get("error");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) return <div className="admin-loading">Loading...</div>;

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleSignOut} className="signout-btn">Sign Out</button>
      </div>
      <div className="admin-content">
        <div className="dashboard-grid">
          <Link href="/admin/clients" className="dashboard-card">
            <div className="dashboard-card-title">Clients</div>
            <div className="dashboard-card-sub">View and manage client records</div>
          </Link>
          <Link href="/admin/appointments" className="dashboard-card">
            <div className="dashboard-card-title">Appointments</div>
            <div className="dashboard-card-sub">View and manage appointments</div>
          </Link>
          <Link href="/admin/invoices" className="dashboard-card">
            <div className="dashboard-card-title">Invoices</div>
            <div className="dashboard-card-sub">View and manage invoices</div>
          </Link>
        </div>
        <div style={{ marginTop: "2rem" }}>
          <div className="record-section">
            <div className="record-section-header">
              <h2>Google Integration</h2>
            </div>
            {connected && (
              <p style={{ color: "#2e7d32", fontWeight: 600, marginBottom: "1rem" }}>
                Google Calendar connected successfully!
              </p>
            )}
            {connError && (
              <p style={{ color: "#c62828", fontWeight: 600, marginBottom: "1rem" }}>
                Connection failed. Please try again.
              </p>
            )}
            <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: "1rem" }}>
              Connect your Google account to enable Calendar sync and Gmail reminders.
            </p>
            <a href="/api/google/auth" className="admin-btn" style={{ display: "inline-block" }}>
              Connect Google Calendar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="admin-loading">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}