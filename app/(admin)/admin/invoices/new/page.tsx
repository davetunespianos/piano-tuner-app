"use client";

import AdminHeader from "../../AdminHeader";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react"
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

type Piano = {
  id: string;
  make: string | null;
  model: string | null;
  type: string | null;
};

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type PianoGroup = {
  piano_id: string;
  piano_label: string;
  line_items: LineItem[];
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

function pianoLabel(p: Piano): string {
  return [p.make, p.model].filter(Boolean).join(" ") || p.type || "Unnamed Piano";
}

function emptyLineItem(): LineItem {
  return { description: "", quantity: 1, unit_price: 0, line_total: 0 };
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientPianos, setClientPianos] = useState<Piano[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    status: "Draft",
    notes: "",
    payment_method: "",
  });
  const [pianoGroups, setPianoGroups] = useState<PianoGroup[]>([]);
  const [isNet30, setIsNet30] = useState(false);

  // Client search state
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // When client changes (without an appointment), refresh the available pianos
  useEffect(() => {
    if (!form.client_id || appointmentId) return;
    const supabase = createClient();
    supabase
      .from("pianos")
      .select("id, make, model, type")
      .eq("client_id", form.client_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setClientPianos(data);
      });
  }, [form.client_id, appointmentId]);

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
        .select(`
          client_id,
          appointment_date,
          appointment_pianos (
            service_type,
            pianos (id, make, model, type)
          )
        `)
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

        const apPianos = (appt.appointment_pianos as any[]) || [];

        const groupsByPiano = new Map<string, PianoGroup>();
        for (const ap of apPianos) {
          if (!ap.pianos) continue;
          const piano = ap.pianos;
          const rate = SERVICE_RATES[ap.service_type] ?? 0;
          const item: LineItem = {
            description: ap.service_type,
            quantity: 1,
            unit_price: rate,
            line_total: rate,
          };
          if (groupsByPiano.has(piano.id)) {
            groupsByPiano.get(piano.id)!.line_items.push(item);
          } else {
            groupsByPiano.set(piano.id, {
              piano_id: piano.id,
              piano_label: pianoLabel(piano),
              line_items: [item],
            });
          }
        }

        setPianoGroups(Array.from(groupsByPiano.values()));

        const { data: pianosData } = await supabase
          .from("pianos")
          .select("id, make, model, type")
          .eq("client_id", appt.client_id)
          .eq("is_active", true)
          .order("created_at", { ascending: true });
        if (pianosData) setClientPianos(pianosData);

        // Pre-fill the client name display for appointment-linked invoices
        if (data) {
          const apptClient = data.find((c) => c.id === appt.client_id);
          if (apptClient) setSelectedClientName(clientNameFromObj(apptClient));
        }
      }
    }

    setLoading(false);
  }

  function clientNameFromObj(c: Client) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  // Filter clients based on search input
  const filteredClients = clientSearch.trim().length === 0
    ? []
    : clients.filter((c) =>
        clientNameFromObj(c).toLowerCase().includes(clientSearch.toLowerCase())
      );

  function selectClient(c: Client) {
    setForm({ ...form, client_id: c.id });
    setSelectedClientName(clientNameFromObj(c));
    setClientSearch("");
    setClientDropdownOpen(false);
  }

  function clearClient() {
    setForm({ ...form, client_id: "" });
    setSelectedClientName("");
    setClientSearch("");
    setPianoGroups([]);
    setClientPianos([]);
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

  function addPianoGroup(pianoId: string) {
    const piano = clientPianos.find((p) => p.id === pianoId);
    if (!piano) return;
    if (pianoGroups.some((g) => g.piano_id === pianoId)) return;
    setPianoGroups([
      ...pianoGroups,
      { piano_id: piano.id, piano_label: pianoLabel(piano), line_items: [emptyLineItem()] },
    ]);
  }

  function removePianoGroup(pianoId: string) {
    setPianoGroups(pianoGroups.filter((g) => g.piano_id !== pianoId));
  }

  function addLineItem(pianoId: string) {
    setPianoGroups(pianoGroups.map((g) =>
      g.piano_id === pianoId
        ? { ...g, line_items: [...g.line_items, emptyLineItem()] }
        : g
    ));
  }

  function removeLineItem(pianoId: string, index: number) {
    setPianoGroups(pianoGroups.map((g) =>
      g.piano_id === pianoId
        ? { ...g, line_items: g.line_items.filter((_, i) => i !== index) }
        : g
    ));
  }

  function handleLineItemChange(pianoId: string, index: number, field: keyof LineItem, value: string) {
    setPianoGroups(pianoGroups.map((g) => {
      if (g.piano_id !== pianoId) return g;
      const updated = [...g.line_items];
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
      return { ...g, line_items: updated };
    }));
  }

  const subtotal = pianoGroups.reduce(
    (sum, g) => sum + g.line_items.reduce((s, item) => s + item.line_total, 0),
    0
  );

  const availableToAdd = clientPianos.filter(
    (p) => !pianoGroups.some((g) => g.piano_id === p.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!form.client_id) {
      setError("Please select a client.");
      setSaving(false);
      return;
    }

    if (pianoGroups.length === 0) {
      setError("Please add at least one piano to the invoice.");
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("invoice_number")
      .order("invoice_number", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = lastInvoice ? lastInvoice.invoice_number + 1 : 436;

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
        paid_date: form.status === "Paid" ? new Date().toISOString().split("T")[0] : null,
      }])
      .select("id")
      .single();

    if (invError || !newInvoice) {
      console.error("Invoice insert error:", invError);
      setError("Error creating invoice. Please try again.");
      setSaving(false);
      return;
    }

    const items = pianoGroups.flatMap((g) =>
      g.line_items
        .filter((item) => item.description && item.line_total > 0)
        .map((item) => ({
          invoice_id: newInvoice.id,
          piano_id: g.piano_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        }))
    );

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("invoice_items").insert(items);
      if (itemsError) {
        console.error("Invoice items insert error:", itemsError);
        setError("Invoice created but line items failed. Please review.");
        setSaving(false);
        return;
      }
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

              {appointmentId ? (
                // When coming from an appointment, show the client name as read-only
                <input
                  type="text"
                  value={selectedClientName}
                  disabled
                  style={{ background: "#f4f4f4", color: "#888" }}
                />
              ) : form.client_id ? (
                // Client already selected — show name with a clear button
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={selectedClientName}
                    disabled
                    style={{ flex: 1, background: "#f4f4f4", color: "#1a1a1a", fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={clearClient}
                    style={{ background: "none", border: "1px solid #aaa", borderRadius: "4px", padding: "0.4rem 0.75rem", cursor: "pointer", color: "#666", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                // Search input + dropdown
                <div ref={clientSearchRef} style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setClientDropdownOpen(true);
                    }}
                    onFocus={() => setClientDropdownOpen(true)}
                    placeholder="Type to search clients..."
                    autoComplete="off"
                  />
                  {clientDropdownOpen && filteredClients.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "0 0 6px 6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 100,
                      maxHeight: "220px",
                      overflowY: "auto",
                    }}>
                      {filteredClients.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={() => selectClient(c)}
                          style={{
                            padding: "0.6rem 0.9rem",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f4")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                        >
                          {clientNameFromObj(c)}
                        </div>
                      ))}
                    </div>
                  )}
                  {clientDropdownOpen && clientSearch.trim().length > 0 && filteredClients.length === 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "0 0 6px 6px",
                      padding: "0.6rem 0.9rem",
                      fontSize: "0.9rem",
                      color: "#888",
                      zIndex: 100,
                    }}>
                      No clients found matching "{clientSearch}"
                    </div>
                  )}
                </div>
              )}
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

          {/* Pianos & Services */}
          <div className="form-section">
            <h2 className="form-section-title">Pianos & Services</h2>

            {pianoGroups.length === 0 && (
              <p style={{ color: "#888", marginBottom: "1rem" }}>
                {form.client_id
                  ? "No pianos added yet. Use the dropdown below to add a piano."
                  : "Select a client first to add pianos."}
              </p>
            )}

            {pianoGroups.map((g) => (
              <div key={g.piano_id} style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{g.piano_label}</h3>
                  <button
                    type="button"
                    onClick={() => removePianoGroup(g.piano_id)}
                    style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
                  >
                    Remove piano
                  </button>
                </div>

                <table className="admin-table" style={{ marginBottom: "0.75rem" }}>
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
                    {g.line_items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={item.description}
                            onChange={(e) => handleLineItemChange(g.piano_id, index, "description", e.target.value)}
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
                            onChange={(e) => handleLineItemChange(g.piano_id, index, "quantity", e.target.value)}
                            min="0"
                            step="0.5"
                            style={{ width: "100%", padding: "0.4rem", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit", fontSize: "0.9rem" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(g.piano_id, index, "unit_price", e.target.value)}
                            min="0"
                            step="0.01"
                            style={{ width: "100%", padding: "0.4rem", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit", fontSize: "0.9rem" }}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>${item.line_total.toFixed(2)}</td>
                        <td>
                          {g.line_items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(g.piano_id, index)}
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

                <button type="button" onClick={() => addLineItem(g.piano_id)} className="admin-btn-outline" style={{ fontSize: "0.85rem" }}>
                  + Add line item
                </button>
              </div>
            ))}

            {availableToAdd.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", color: "#666" }}>
                  Add another piano to this invoice:
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addPianoGroup(e.target.value);
                  }}
                  style={{ padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit", fontSize: "0.9rem" }}
                >
                  <option value="">Select a piano...</option>
                  {availableToAdd.map((p) => (
                    <option key={p.id} value={p.id}>{pianoLabel(p)}</option>
                  ))}
                </select>
              </div>
            )}

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