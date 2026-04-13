"use client";

import AdminHeader from "../../AdminHeader";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react"
import { createClient } from "../../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

const SERVICE_RATES: Record<string, number> = {
  "Standard Tuning": 100,
  "Pitch Raise": 125,
  "Piano Life Saver Maintenance": 30,
  "Regulation": 50,
  "Voicing": 50,
  "Repairs / Other": 50,
  "Piano Life Saver Installation": 0,
};

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    status: "Draft",
    notes: "",
    payment_method: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, line_total: 0 }
  ]);
  const [isNet30, setIsNet30] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchClients();
      }
    });
  }, [router]);

  async function fetchClients() {
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, company_name, address, city, state, zip")
      .order("last_name", { ascending: true });
    if (data) setClients(data);

    if (appointmentId) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("client_id, service_type, appointment_date")
        .eq("id", appointmentId)
        .single();

      if (appt) {
        const today = new Date().toISOString().split("T")[0];

        setForm((prev) => ({
          ...prev,
          client_id: appt.client_id,
          invoice_date: today,
          due_date: today,
        }));

        const rate = SERVICE_RATES[appt.service_type] || 0;
        setLineItems([{
          description: appt.service_type,
          quantity: 1,
          unit_price: rate,
          line_total: rate,
        }]);
      }
    }

    setLoading(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleNet30Change(checked: boolean) {
    setIsNet30(checked);
    if (checked && form.invoice_date) {
      const date = new Date(form.invoice_date);
      date.setDate(date.getDate() + 30);
      setForm({ ...form, due_date: date.toISOString().split("T")[0] });
    } else {
      setForm({ ...form, due_date: form.invoice_date });
    }
  }

  function handleInvoiceDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value;
    let dueDate = date;
    if (isNet30) {
      const d = new Date(date);
      d.setDate(d.getDate() + 30);
      dueDate = d.toISOString().split("T")[0];
    }
    setForm({ ...form, invoice_date: date, due_date: dueDate });
  }

  function handleLineItemChange(index: number, field: keyof LineItem, value: string) {
    const updated = [...lineItems];
    const item = { ...updated[index] };

    if (field === "description") {
      item.description = value;
      if (SERVICE_RATES[value] !== undefined) {
        item.unit_price = SERVICE_RATES[value];
        item.line_total = item.quantity * item.unit_price;
      }
    } else if (field === "quantity") {
      item.quantity = parseFloat(value) || 0;
      item.line_total = item.quantity * item.unit_price;
    } else if (field === "unit_price") {
      item.unit_price = parseFloat(value) || 0;
      item.line_total = item.quantity * item.unit_price;
    }

    updated[index] = item;
    setLineItems(updated);
  }

  function addLineItem() {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, line_total: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  function clientName(c: Client) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();

    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .order("invoice_number", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = lastInvoice ? lastInvoice.invoice_number + 1 : 425;

    const { data: newInvoice, error: invError } = await supabase
      .from("invoices")
      .insert([{
        client_id: form.client_id,
        invoice_number: nextNumber,
        invoice_date: form.invoice_date,
        due_date: form.due_date || form.invoice_date,
        status: form.status,
        notes: form.notes || null,
        payment_method: form.payment_method || null,
        appointment_id: appointmentId || null,
      }])
      .select("id")
      .single();

    if (invError || !newInvoice) {
      setError("Error creating invoice. Please try again.");
      setSaving(false);
      return;
    }

    const items = lineItems
      .filter((item) => item.description && item.line_total > 0)
      .map((item) => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }));

    if (items.length > 0) {
      await supabase.from("invoice_items").insert(items);
    }

    router.push(`/admin/invoices/${newInvoice.id}`);
  }

  if (loading) return <div className="admin-loading">Loading...</div>;
  return (
    <div className="admin-wrapper">
      <AdminHeader title="New Invoice" />
      <div className="admin-content">
        <form onSubmit={handleSubmit} className="admin-form" style={{ maxWidth: "800px" }}>

          {/* Client */}
          <div className="form-section">
            <h2 className="form-section-title">Client</h2>
            <div className="form-field">
              <label>Client <span className="form-required">*</span></label>
              <select name="client_id" value={form.client_id} onChange={handleFormChange} required>
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{clientName(c)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="form-section">
            <h2 className="form-section-title">Invoice Details</h2>
            <div className="form-row">
              <div className="form-field">
                <label>Invoice Date <span className="form-required">*</span></label>
                <input
                  type="date"
                  name="invoice_date"
                  value={form.invoice_date}
                  onChange={handleInvoiceDateChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>Due Date <span className="form-required">*</span></label>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>
            <div className="form-field">
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isNet30}
                  onChange={(e) => handleNet30Change(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                Net 30 (due date auto-calculated)
              </label>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleFormChange}>
                  <option value="Draft">Draft</option>
                  <option value="Open">Open</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div className="form-field">
                <label>Payment Method</label>
                <select name="payment_method" value={form.payment_method} onChange={handleFormChange}>
                  <option value="">Select...</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Venmo">Venmo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="form-section">
            <h2 className="form-section-title">Services</h2>
            <table className="admin-table" style={{ marginBottom: "1rem" }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ width: "100px" }}>Qty / Hrs</th>
                  <th style={{ width: "120px" }}>Unit Price</th>
                  <th style={{ width: "120px" }}>Total</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                        style={{ width: "100%", padding: "0.4rem", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit", fontSize: "0.9rem" }}
                      >
                        <option value="">Select a service...</option>
                        <option value="Standard Tuning">Standard Tuning</option>
                        <option value="Pitch Raise">Pitch Raise</option>
                        <option value="Regulation">Regulation</option>
                        <option value="Voicing">Voicing</option>
                        <option value="Piano Life Saver Maintenance">Piano Life Saver Maintenance</option>
                        <option value="Piano Life Saver Installation">Piano Life Saver Installation</option>
                        <option value="Repairs / Other">Repairs / Other</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                        min="0"
                        step="0.5"
                        style={{ width: "100%", padding: "0.4rem", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit", fontSize: "0.9rem" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(index, "unit_price", e.target.value)}
                        min="0"
                        step="0.01"
                        style={{ width: "100%", padding: "0.4rem", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit", fontSize: "0.9rem" }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>${item.line_total.toFixed(2)}</td>
                    <td>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: "1.2rem", fontWeight: 600 }}
                        >
                          x
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addLineItem} className="admin-btn-outline">
              + Add Line Item
            </button>
            <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
              <div style={{ fontSize: "1rem", color: "#666", marginBottom: "0.5rem" }}>
                Subtotal: <strong>${subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                Total: ${subtotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <h2 className="form-section-title">Notes</h2>
            <div className="form-field">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleFormChange}
                rows={3}
                placeholder="Any notes to appear on the invoice..."
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link href="/admin/invoices" className="admin-btn-outline">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
export default function NewInvoice() {
  return (
    <Suspense fallback={<div className="admin-loading">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}