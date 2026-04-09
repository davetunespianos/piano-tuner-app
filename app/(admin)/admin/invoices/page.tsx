"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Invoice = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  status: string;
  clients: {
    first_name: string;
    last_name: string | null;
    company_name: string | null;
  };
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchInvoices();
      }
    });
  }, [router]);

  async function fetchInvoices() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        status,
        clients (first_name, last_name, company_name)
      `)
      .order("invoice_number", { ascending: false });

    if (!error && data) setInvoices(data as unknown as Invoice[]);
    setLoading(false);
  }

  function clientName(inv: Invoice) {
    if (inv.clients.company_name) return inv.clients.company_name;
    return [inv.clients.first_name, inv.clients.last_name].filter(Boolean).join(" ");
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  }

  const filtered = invoices.filter((inv) => {
    if (filter === "all") return true;
    return inv.status.toLowerCase() === filter;
  });

  if (loading) return <div className="admin-loading">Loading invoices...</div>;
 return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>Invoices</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/admin/dashboard" className="admin-back">Dashboard</Link>
          <Link href="/admin/invoices/new" className="admin-btn">+ New Invoice</Link>
        </div>
      </div>
      <div className="admin-content">
        <div className="filter-tabs">
          <button className={filter === "all" ? "filter-tab active" : "filter-tab"} onClick={() => setFilter("all")}>All</button>
          <button className={filter === "draft" ? "filter-tab active" : "filter-tab"} onClick={() => setFilter("draft")}>Draft</button>
          <button className={filter === "sent" ? "filter-tab active" : "filter-tab"} onClick={() => setFilter("sent")}>Sent</button>
          <button className={filter === "paid" ? "filter-tab active" : "filter-tab"} onClick={() => setFilter("paid")}>Paid</button>
          <button className={filter === "overdue" ? "filter-tab active" : "filter-tab"} onClick={() => setFilter("overdue")}>Overdue</button>
        </div>
        {filtered.length === 0 ? (
          <p style={{ color: "#888", marginTop: "2rem" }}>No invoices found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                  className="admin-table-row"
                >
                  <td><span className="client-name">INV-{inv.invoice_number}</span></td>
                  <td>{clientName(inv)}</td>
                  <td>{formatDate(inv.invoice_date)}</td>
                  <td>{formatDate(inv.due_date)}</td>
                  <td>
                    <span className={`status-badge status-${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 