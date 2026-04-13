"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminHeader from "../AdminHeader";

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const connError = searchParams.get("error");
  const [revenue, setRevenue] = useState({
    paidThisMonth: 0,
    outstanding: 0,
    overdue: 0,
    totalInvoiced: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        setLoading(false);
        fetchRevenue();
      }
    });
  }, [router]);

  async function fetchRevenue() {
    const supabase = createClient();
    const { data: invoices } = await supabase
      .from("invoices")
      .select("status, due_date, invoice_items(line_total)");

    if (!invoices) return;

    let paidThisMonth = 0;
    let outstanding = 0;
    let overdue = 0;
    let totalInvoiced = 0;

    invoices.forEach((inv: any) => {
      const total = inv.invoice_items.reduce((sum: number, item: any) => sum + item.line_total, 0);
      totalInvoiced += total;
      if (inv.status === "Paid") paidThisMonth += total;
      else if (inv.status === "Overdue") overdue += total;
      else if (["Open", "Sent"].includes(inv.status)) outstanding += total;
    });

    setRevenue({ paidThisMonth, outstanding, overdue, totalInvoiced });
  }

  if (loading) return <div className="admin-loading">Loading...</div>;

  return (
    <div className="admin-wrapper">
      <AdminHeader title="Admin Dashboard" />
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
              <h2>Revenue Summary</h2>
              <Link href="/admin/invoices" className="admin-btn-outline">View Invoices</Link>
            </div>
            <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Total Invoiced</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", marginTop: "0.25rem" }}>
                  ${revenue.totalInvoiced.toFixed(2)}
                </div>
              </div>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Collected (Paid)</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", marginTop: "0.25rem", color: "#2e7d32" }}>
                  ${revenue.paidThisMonth.toFixed(2)}
                </div>
              </div>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Outstanding</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", marginTop: "0.25rem", color: "#1565c0" }}>
                  ${revenue.outstanding.toFixed(2)}
                </div>
              </div>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Overdue</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", marginTop: "0.25rem", color: "#c62828" }}>
                  ${revenue.overdue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
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