"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
            <div className="dashboard-card disabled">
            <div className="dashboard-card-title">Invoices</div>
            <div className="dashboard-card-sub">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}