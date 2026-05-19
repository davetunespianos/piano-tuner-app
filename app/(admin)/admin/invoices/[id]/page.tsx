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
    alternate_email: string | null;
  };
};

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  piano_id: string | null;
  pianos: {
    make: string | null;
    model: string | null;
    type: string | null;
  } | null;
};

type Group = { key: string; label: string | null; items: LineItem[] };

function pianoLabel(p: NonNullable<LineItem["pianos"]>): string {
  return [p.make, p.model].filter(Boolean).join(" ") || p.type || "Unnamed Piano";
}

function groupByPiano(items: LineItem[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const key = item.piano_id ?? "__no_piano__";
    const label = item.piano_id && item.pianos ? pianoLabel(item.pianos) : null;
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.values());
}

export default function InvoiceDetail() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmailPicker, setShowEmailPicker] = useState(false);
  const [emailToPrimary, setEmailToPrimary] = useState(true);
  const [emailToAlternate, setEmailToAlternate] = useState(false);
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
        clients (id, first_name, last_name, company_name, address, city, state, zip, phone, email, alternate_email)
      `)
      .eq("id", id)
      .single();

    const { data: itemData } = await supabase
      .from("invoice_items")
      .select(`
        id, description, quantity, unit_price, line_total, piano_id,
        pianos (make, model, type)
      `)
      .eq("invoice_id", id)
      .order("created_at", { ascending: true });

    if (invData) setInvoice(invData as unknown as Invoice);
    if (itemData) setLineItems(itemData as unknown as LineItem[]);
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

  function openEmailPicker() {
    if (!invoice) return;
    if (!invoice.clients.email && !invoice.clients.alternate_email) {
      alert("This client has no email addresses on file.");
      return;
    }
    setEmailToPrimary(!!invoice.clients.email);
    setEmailToAlternate(!!invoice.clients.alternate_email);
    setShowEmailPicker(true);
  }

  async function sendInvoiceEmail() {
    if (!invoice) return;
    const recipients: string[] = [];
    if (emailToPrimary && invoice.clients.email) recipients.push(invoice.clients.email);
    if (emailToAlternate && invoice.clients.alternate_email) recipients.push(invoice.clients.alternate_email);

    if (recipients.length === 0) {
      alert("Please select at least one recipient.");
      return;
    }

    setShowEmailPicker(false);
    setSending(true);
    try {
      const res = await fetch("/api/email-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id, recipients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchInvoice();
      alert(`Invoice sent successfully to ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}!`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setSending(false);
  }

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
  }

  function clientName(c: Invoice["clients"]) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
  const isPaid = invoice?.status === "Paid";
  const groups = groupByPiano(lineItems);

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
                fileName={`Invoice_#${invoice.invoice_number}_David_Cossey_Piano_Tuner.pdf`}
                className="admin-btn"
              >
                {({ loading: pdfLoading }) => pdfLoading ? "Generating..." : "Download PDF"}
              </PDFDownloadLink>
            )}
            {invoice && (
              <button
                onClick={openEmailPicker}
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
              {invoice.clients.company_name && (
                <>{[invoice.clients.first_name, invoice.clients.last_name].filter(Boolean).join(" ")}<br /></>
              )}
              {invoice.clients.address && <>{invoice.clients.address}<br /></>}
              {[invoice.clients.city, invoice.clients.state, invoice.clients.zip].filter(Boolean).join(", ")}
              {invoice.clients.phone && <><br />{invoice.clients.phone}</>}
            </div>
          </div>

          {/* Line items, grouped by piano */}
          {groups.map((g) => (
            <div key={g.key} style={{ marginBottom: "1.5rem" }}>
              {g.label && (
                <div style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  backgroundColor: "#f4f4f4",
                  padding: "0.5rem 0.75rem",
                  marginBottom: "0.25rem",
                }}>
                  {g.label}
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.5rem", fontSize: "0.85rem" }}>Description</th>
                    <th style={{ textAlign: "center", padding: "0.5rem 0.5rem", fontSize: "0.85rem", width: "100px" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "0.5rem 0.5rem", fontSize: "0.85rem", width: "120px" }}>Unit Price</th>
                    <th style={{ textAlign: "right", padding: "0.5rem 0.5rem", fontSize: "0.85rem", width: "120px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.95rem" }}>{item.description}</td>
                      <td style={{ textAlign: "center", padding: "0.6rem 0.5rem", fontSize: "0.95rem" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right", padding: "0.6rem 0.5rem", fontSize: "0.95rem" }}>${item.unit_price.toFixed(2)}</td>
                      <td style={{ textAlign: "right", padding: "0.6rem 0.5rem", fontSize: "0.95rem" }}>${item.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
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

        {/* Email recipient picker modal */}
        {showEmailPicker && invoice && (
          <div
            onClick={() => setShowEmailPicker(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "8px",
                maxWidth: "400px",
                width: "90%",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Send invoice to:</h3>

              {invoice.clients.email && (
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={emailToPrimary}
                    onChange={(e) => setEmailToPrimary(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span>{invoice.clients.email} <span style={{ color: "#888", fontSize: "0.85rem" }}>(primary)</span></span>
                </label>
              )}

              {invoice.clients.alternate_email && (
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={emailToAlternate}
                    onChange={(e) => setEmailToAlternate(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span>{invoice.clients.alternate_email} <span style={{ color: "#888", fontSize: "0.85rem" }}>(alternate)</span></span>
                </label>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowEmailPicker(false)}
                  className="admin-btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvoiceEmail}
                  className="admin-btn"
                  disabled={!emailToPrimary && !emailToAlternate}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}