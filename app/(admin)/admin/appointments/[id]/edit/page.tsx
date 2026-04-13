"use client";

import AdminHeader from "../../../AdminHeader";
import { useEffect, useState } from "react";
import { createClient } from "../../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
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

export default function EditAppointment() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [clients, setClients] = useState<Client[]>([]);
  const [pianos, setPianos] = useState<Piano[]>([]);
  const [filteredPianos, setFilteredPianos] = useState<Piano[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    piano_id: "",
    service_type: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: "60",
    status: "Scheduled",
    notes: "",
    temperature_f: "",
    humidity_percent: "",
  });

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

    const { data: apptData } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (clientData) setClients(clientData);
    if (pianoData) setPianos(pianoData);

    if (apptData) {
      const d = new Date(apptData.appointment_date);
      const date = d.toISOString().split("T")[0];
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const time = `${hours}:${minutes}`;

      setForm({
        client_id: apptData.client_id || "",
        piano_id: apptData.piano_id || "",
        service_type: apptData.service_type || "",
        appointment_date: date,
        appointment_time: time,
        duration_minutes: apptData.duration_minutes?.toString() || "60",
        status: apptData.status || "Scheduled",
        notes: apptData.notes || "",
        temperature_f: apptData.temperature_f?.toString() || "",
        humidity_percent: apptData.humidity_percent?.toString() || "",
      });

      if (pianoData) {
        setFilteredPianos(pianoData.filter((p) => p.client_id === apptData.client_id));
      }
    }

    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "client_id") {
      setFilteredPianos(pianos.filter((p) => p.client_id === value));
      setForm({ ...form, client_id: value, piano_id: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const appointmentDate = new Date(`${form.appointment_date}T${form.appointment_time}`);

    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({
        client_id: form.client_id,
        piano_id: form.piano_id || null,
        service_type: form.service_type,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        status: form.status,
        notes: form.notes || null,
        temperature_f: form.temperature_f ? parseFloat(form.temperature_f) : null,
        humidity_percent: form.humidity_percent ? parseFloat(form.humidity_percent) : null,
      })
      .eq("id", id);

    if (error) {
      setError("Error saving changes. Please try again.");
      setSaving(false);
    } else {
      router.push(`/admin/appointments/${id}`);
    }
  }

  function clientName(c: Client) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  function pianoName(p: Piano) {
    return [p.make, p.model].filter(Boolean).join(" ") || p.type || "Unnamed Piano";
  }

  if (loading) return <div className="admin-loading">Loading appointment...</div>;
 return (
    <div className="admin-wrapper">
      <AdminHeader title="Edit Appointment" />
      <div className="admin-content">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-section">
            <h2 className="form-section-title">Client & Piano</h2>
            <div className="form-field">
              <label>Client <span className="form-required">*</span></label>
              <select name="client_id" value={form.client_id} onChange={handleChange} required>
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{clientName(c)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Piano</label>
              <select name="piano_id" value={form.piano_id} onChange={handleChange} disabled={!form.client_id}>
                <option value="">Select a piano...</option>
                {filteredPianos.map((p) => (
                  <option key={p.id} value={p.id}>{pianoName(p)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-section">
            <h2 className="form-section-title">Service</h2>
            <div className="form-field">
              <label>Service Type <span className="form-required">*</span></label>
              <select name="service_type" value={form.service_type} onChange={handleChange} required>
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
            <div className="form-field">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
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
          <div className="form-section">
            <h2 className="form-section-title">Notes</h2>
            <div className="form-field">
              <label>Appointment Notes</label>
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
            <Link href={`/admin/appointments/${id}`} className="admin-btn-outline">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 