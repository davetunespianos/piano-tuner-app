"use client";

import AdminHeader from "../../AdminHeader";
import { PDFDownloadLink } from "@react-pdf/renderer";
import InvoicePDF from "./InvoicePDF";
import { useEffect, useState } from "react";
import { createClient } from "../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Invoice = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  status: string;
  notes: string | null;
  payment_method: string | null;
  paid_date: string | null;
  clients: {
    id: string;
    first_name: string;
    last_name: string | null;
    company_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
  };
};

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export default function InvoiceDetail() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchInvoice();
      }
    });
  }, [router]);

  async function fetchInvoice() {
    const supabase = createClient();
    const { data: invData } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, invoice_date, due_date, status,
        notes, payment_method, paid_date,
        clients (id, first_name, last_name, company_name, address, city, state, zip, phone, email)
      `)
      .eq("id", id)
      .single();

    const { data: itemData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true });

    if (invData) setInvoice(invData as unknown as Invoice);
    if (itemData) setLineItems(itemData);
    setLoading(false);
  }

  async function updateStatus(status: string) {
    setUpdating(true);
    const supabase = createClient();
    const updates: any = { status };
    if (status === "Paid") updates.paid_date = new Date().toISOString().split("T")[0];
    await supabase.from("invoices").update(updates).eq("id", id);
    await fetchInvoice();
    setUpdating(false);
  }

  async function handlePaymentMethod(method: string) {
    if (!method) return;
    setUpdating(true);
    const supabase = createClient();
    await supabase.from("invoices").update({
      status: "Paid",
      payment_method: method,
      paid_date: new Date().toISOString().split("T")[0],
    }).eq("id", id);
    await fetchInvoice();
    setUpdating(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("invoices").delete().eq("id", id);
    router.push("/admin/invoices");
  }

  async function handleEmailInvoice() {
    if (!invoice) return;
    if (!confirm(`Send invoice #${invoice.invoice_number} to ${invoice.clients.email}?`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/email-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchInvoice();
      alert("Invoice sent successfully!");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setSending(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
  }

  function clientName(c: Invoice["clients"]) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  function clientAddress(c: Invoice["clients"]) {
    return [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
  const isPaid = invoice?.status === "Paid";

  if (loading) return <div className="admin-loading">Loading invoice...</div>;
  if (!invoice) return <div className="admin-loading">Invoice not found.</div>;
 return (
    <div className="admin-wrapper">
      <AdminHeader
        title={`INV-${invoice.invoice_number}`}
        actions={
          <>
            {invoice && (
              <PDFDownloadLink
                document={<InvoicePDF invoice={invoice} lineItems={lineItems} />}
                fileName={`invoice-${invoice.invoice_number}.pdf`}
                className="admin-btn"
              >
                {({ loading: pdfLoading }) => pdfLoading ? "Generating..." : "Download PDF"}
              </PDFDownloadLink>
            )}
            {invoice && (
              <button
                onClick={handleEmailInvoice}
                disabled={sending}
                className="admin-btn"
              >
                {sending ? "Sending..." : "Email Invoice"}
              </button>
            )}
            <button onClick={handleDelete} className="admin-btn-danger">Delete</button>
          </>
        }
      />
      <div className="admin-content">

        {/* Status bar */}
        <div className="record-section">
          <div className="record-section-header">
            <h2>Status</h2>
            <span className={`status-badge status-${invoice.status.toLowerCase()}`}>
              {invoice.status}
            </span>
          </div>
          {invoice.paid_date && (
            <p style={{ marginTop: "0", marginBottom: "1rem", fontSize: "0.9rem", color: "#2e7d32", fontWeight: 600 }}>
              Paid on {formatDate(invoice.paid_date)}
              {invoice.payment_method && ` via ${invoice.payment_method}`}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {["Draft", "Open", "Sent", "Paid", "Overdue"].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updating || invoice.status === s}
                className={invoice.status === s ? "admin-btn" : "admin-btn-outline"}
                style={{ opacity: invoice.status === s ? 0.6 : 1 }}
              >
                {s}
              </button>
            ))}
          </div>
          {invoice.status !== "Paid" && (
            <div className="form-field" style={{ marginTop: "1rem", maxWidth: "250px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.4rem", display: "block" }}>
                Mark as paid via:
              </label>
              <select
                onChange={(e) => handlePaymentMethod(e.target.value)}
                defaultValue=""
                disabled={updating}
                style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit", color: "#1a1a1a", background: "#fff" }}
              >
                <option value="">Select payment method...</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Venmo">Venmo</option>
                <option value="ACH">ACH</option>
              </select>
            </div>
          )}
        </div>

        {/* Invoice preview */}
        <div className="record-section invoice-preview">

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                David Cossey - Piano Tuner
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.6 }}>
                7690 Oxford Ct.<br />
                Ypsilanti, MI 48197<br />
                (734) 812-8096
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "0.5rem" }}>
                INVOICE
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.8 }}>
                <strong>Invoice #:</strong> {invoice.invoice_number}<br />
                <strong>Invoice Date:</strong> {formatDate(invoice.invoice_date)}<br />
                <strong>Due Date:</strong> {formatDate(invoice.due_date)}
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#aaa", marginBottom: "0.5rem" }}>
              Bill To
            </div>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
              <strong>{clientName(invoice.clients)}</strong><br />
              {invoice.clients.address && <>{invoice.clients.address}<br /></>}
              {[invoice.clients.city, invoice.clients.state, invoice.clients.zip].filter(Boolean).join(", ")}
              {invoice.clients.phone && <><br />{invoice.clients.phone}</>}
            </div>
          </div>

          {/* Line items */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                <th style={{ textAlign: "left", padding: "0.5rem 0", fontSize: "0.85rem" }}>Description</th>
                <th style={{ textAlign: "center", padding: "0.5rem 0", fontSize: "0.85rem", width: "100px" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "0.5rem 0", fontSize: "0.85rem", width: "120px" }}>Unit Price</th>
                <th style={{ textAlign: "right", padding: "0.5rem 0", fontSize: "0.85rem", width: "120px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem 0", fontSize: "0.95rem" }}>{item.description}</td>
                  <td style={{ textAlign: "center", padding: "0.75rem 0", fontSize: "0.95rem" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", padding: "0.75rem 0", fontSize: "0.95rem" }}>${item.unit_price.toFixed(2)}</td>
                  <td style={{ textAlign: "right", padding: "0.75rem 0", fontSize: "0.95rem" }}>${item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.95rem" }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.95rem" }}>
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.95rem" }}>
                <span>Paid</span>
                <span>${isPaid ? subtotal.toFixed(2) : "0.00"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", fontSize: "1.1rem", fontWeight: 700, borderTop: "2px solid #1a1a1a", marginTop: "0.25rem" }}>
                <span>Amount Due</span>
                <span>${isPaid ? "0.00" : subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          {invoice.notes && (
            <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "#666" }}>{invoice.notes}</p>
          )}
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #eee", fontSize: "0.85rem", color: "#888", display: "flex", justifyContent: "center", alignItems: "center", gap: "3rem" }}>
            <div>
              <p>Thank you for your business!</p>
              <p style={{ marginTop: "0.5rem" }}>Payment forms accepted:</p>
              <p style={{ marginTop: "0.25rem" }}>Venmo - @davetunespianos</p>
              <p>Cash or Check</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <img src="/Venmo_QR_Code.jpg" alt="Venmo QR Code" style={{ width: "140px", height: "100px", display: "block" }} />
              <p style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>Scan to pay via Venmo</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
} 