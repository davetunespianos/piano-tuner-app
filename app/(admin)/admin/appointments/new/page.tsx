"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "../../../../../lib/supabase";
import { useRouter } from "next/navigation";
import AdminHeader from "../../AdminHeader";
import Link from "next/link";

type Client = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

type Piano = {
  id: string;
  make: string | null;
  model: string | null;
  type: string | null;
  client_id: string;
};

type AppointmentPiano = {
  piano_id: string;
  service_type: string;
};

export default function NewAppointment() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [pianos, setPianos] = useState<Piano[]>([]);
  const [filteredPianos, setFilteredPianos] = useState<Piano[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: "120",
    status: "Scheduled",
    notes: "",
    temperature_f: "",
    humidity_percent: "",
  });
  const [appointmentPianos, setAppointmentPianos] = useState<AppointmentPiano[]>([
    { piano_id: "", service_type: "" }
  ]);

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
        fetchData();
      }
    });
  }, [router]);

  async function fetchData() {
    const supabase = createClient();
    const { data: clientData } = await supabase
      .from("clients")
      .select("id, first_name, last_name, company_name")
      .order("last_name", { ascending: true });

    const { data: pianoData } = await supabase
      .from("pianos")
      .select("id, make, model, type, client_id");

    if (clientData) setClients(clientData);
    if (pianoData) setPianos(pianoData);
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
    setFilteredPianos(pianos.filter((p) => p.client_id === c.id));
    setAppointmentPianos([{ piano_id: "", service_type: "" }]);
  }

  function clearClient() {
    setForm({ ...form, client_id: "" });
    setSelectedClientName("");
    setClientSearch("");
    setFilteredPianos([]);
    setAppointmentPianos([{ piano_id: "", service_type: "" }]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePianoChange(index: number, field: keyof AppointmentPiano, value: string) {
    const updated = [...appointmentPianos];
    updated[index] = { ...updated[index], [field]: value };
    setAppointmentPianos(updated);
  }

  function addPiano() {
    setAppointmentPianos([...appointmentPianos, { piano_id: "", service_type: "" }]);
  }

  function removePiano(index: number) {
    setAppointmentPianos(appointmentPianos.filter((_, i) => i !== index));
  }

  function pianoName(p: Piano) {
    return [p.make, p.model].filter(Boolean).join(" ") || p.type || "Unnamed Piano";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!form.client_id) {
      setError("Please select a client.");
      setSaving(false);
      return;
    }

    const appointmentDate = new Date(`${form.appointment_date}T${form.appointment_time}`);
    const supabase = createClient();

    const { data: newAppt, error: apptError } = await supabase
      .from("appointments")
      .insert([{
        client_id: form.client_id,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        status: form.status,
        notes: form.notes || null,
        temperature_f: form.temperature_f ? parseFloat(form.temperature_f) : null,
        humidity_percent: form.humidity_percent ? parseFloat(form.humidity_percent) : null,
      }])
      .select("id")
      .single();

    if (apptError || !newAppt) {
      setError("Error saving appointment. Please try again.");
      setSaving(false);
      return;
    }

    const validPianos = appointmentPianos.filter((p) => p.service_type);
    if (validPianos.length > 0) {
      await supabase.from("appointment_pianos").insert(
        validPianos.map((p) => ({
          appointment_id: newAppt.id,
          piano_id: p.piano_id || null,
          service_type: p.service_type,
        }))
      );
    }

    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: newAppt.id, action: "sync" }),
    });

    await fetch("/api/confirm-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: newAppt.id }),
    });

    router.push("/admin/appointments");
  }

  if (loading) return <div className="admin-loading">Loading...</div>;
  return (
    <div className="admin-wrapper">
      <AdminHeader title="New Appointment" />
      <div className="admin-content">
        <form onSubmit={handleSubmit} className="admin-form">

          {/* Client */}
          <div className="form-section">
            <h2 className="form-section-title">Client</h2>
            <div className="form-field">
              <label>Client <span className="form-required">*</span></label>

              {form.client_id ? (
                // Client selected — show name with Change button
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

          {/* Pianos & Services */}
          <div className="form-section">
            <h2 className="form-section-title">Pianos & Services</h2>
            {appointmentPianos.map((ap, index) => (
              <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div className="form-field" style={{ flex: 2, minWidth: "200px" }}>
                  <label>Piano</label>
                  <select
                    value={ap.piano_id}
                    onChange={(e) => handlePianoChange(index, "piano_id", e.target.value)}
                    disabled={!form.client_id}
                  >
                    <option value="">Select a piano...</option>
                    {filteredPianos.map((p) => (
                      <option key={p.id} value={p.id}>{pianoName(p)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ flex: 2, minWidth: "200px" }}>
                  <label>Service Type <span className="form-required">*</span></label>
                  <select
                    value={ap.service_type}
                    onChange={(e) => handlePianoChange(index, "service_type", e.target.value)}
                    required={index === 0}
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
                </div>
                {appointmentPianos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePiano(index)}
                    className="admin-btn-danger"
                    style={{ marginBottom: "1rem" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPiano} className="admin-btn-outline">
              + Add Another Piano
            </button>
          </div>

          {/* Date & Time */}
          <div className="form-section">
            <h2 className="form-section-title">Date & Time</h2>
            <div className="form-row">
              <div className="form-field">
                <label>Date <span className="form-required">*</span></label>
                <input
                  type="date"
                  name="appointment_date"
                  value={form.appointment_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>Time <span className="form-required">*</span></label>
                <input
                  type="time"
                  name="appointment_time"
                  value={form.appointment_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={form.duration_minutes}
                  onChange={handleChange}
                  min="15"
                  step="15"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="form-section">
            <h2 className="form-section-title">Status</h2>
            <div className="form-field">
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Conditions */}
          <div className="form-section">
            <h2 className="form-section-title">Conditions</h2>
            <div className="form-row">
              <div className="form-field">
                <label>Temperature (F)</label>
                <input
                  type="number"
                  name="temperature_f"
                  value={form.temperature_f}
                  onChange={handleChange}
                  placeholder="e.g. 68"
                  step="0.1"
                />
              </div>
              <div className="form-field">
                <label>Humidity (%)</label>
                <input
                  type="number"
                  name="humidity_percent"
                  value={form.humidity_percent}
                  onChange={handleChange}
                  placeholder="e.g. 45"
                  step="0.1"
                />
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
                onChange={handleChange}
                rows={4}
                placeholder="Any notes about this appointment..."
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link href="/admin/appointments" className="admin-btn-outline">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Appointment"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}