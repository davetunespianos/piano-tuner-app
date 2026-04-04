"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  appointment_date: string;
  service_type: string;
  status: string;
  duration_minutes: number | null;
  notes: string | null;
  temperature_f: number | null;
  humidity_percent: number | null;
  google_event_id: string | null;
  clients: {
    id: string;
    first_name: string;
    last_name: string | null;
    company_name: string | null;
    phone: string | null;
    email: string | null;
  };
  pianos: {
    id: string;
    make: string | null;
    model: string | null;
    type: string | null;
    serial_number: string | null;
  } | null;
};

export default function AppointmentRecord() {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchAppointment();
      }
    });
  }, [router]);

  async function fetchAppointment() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        service_type,
        status,
        duration_minutes,
        notes,
        temperature_f,
        humidity_percent,
        google_event_id,
        clients (id, first_name, last_name, company_name, phone, email),
        pianos (id, make, model, type, serial_number)
      `)
      .eq("id", id)
      .single();

    if (!error && data) setAppointment(data as unknown as Appointment);
    setLoading(false);
  }

  function clientName(a: Appointment) {
    if (a.clients.company_name) return a.clients.company_name;
    return [a.clients.first_name, a.clients.last_name].filter(Boolean).join(" ");
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this appointment? This cannot be undone.")) return;

    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id, action: "delete" }),
    });

    const supabase = createClient();
    await supabase.from("appointments").delete().eq("id", id);
    router.push("/admin/appointments");
  }
  
  if (loading) return <div className="admin-loading">Loading appointment...</div>;
  if (!appointment) return <div className="admin-loading">Appointment not found.</div>;
 return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>{formatDate(appointment.appointment_date)}</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/admin/appointments" className="admin-back">Back to Appointments</Link>
          <button onClick={handleDelete} className="admin-btn-danger">Delete</button>
          <Link href={`/admin/appointments/${id}/edit`} className="admin-btn">Edit Appointment</Link>
        </div>
      </div>
      <div className="admin-content">

        {/* Summary */}
        <div className="record-section">
          <div className="record-section-header">
            <h2>Appointment Details</h2>
            <span className={`status-badge status-${appointment.status.toLowerCase()}`}>
              {appointment.status}
            </span>
          </div>
          <div className="record-grid">
            <div className="record-field">
              <span className="record-label">Date</span>
              <span className="record-value">{formatDate(appointment.appointment_date)}</span>
            </div>
            <div className="record-field">
              <span className="record-label">Time</span>
              <span className="record-value">{formatTime(appointment.appointment_date)}</span>
            </div>
            <div className="record-field">
              <span className="record-label">Service</span>
              <span className="record-value">{appointment.service_type}</span>
            </div>
            {appointment.duration_minutes && (
              <div className="record-field">
                <span className="record-label">Duration</span>
                <span className="record-value">{appointment.duration_minutes} minutes</span>
              </div>
            )}
          </div>
          {appointment.notes && (
            <div className="record-notes">
              <span className="record-label">Notes</span>
              <p>{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Client */}
        <div className="record-section">
          <div className="record-section-header">
            <h2>Client</h2>
            <Link href={`/admin/clients/${appointment.clients.id}`} className="admin-btn-outline">
              View Client
            </Link>
          </div>
          <div className="record-grid">
            <div className="record-field">
              <span className="record-label">Name</span>
              <span className="record-value">{clientName(appointment)}</span>
            </div>
            {appointment.clients.phone && (
              <div className="record-field">
                <span className="record-label">Phone</span>
                <span className="record-value">
                  <a href={`tel:${appointment.clients.phone}`} style={{ color: "#1a1a1a" }}>
                    {appointment.clients.phone}
                  </a>
                </span>
              </div>
            )}
            {appointment.clients.email && (
              <div className="record-field">
                <span className="record-label">Email</span>
                <span className="record-value">
                  <a href={`mailto:${appointment.clients.email}`} style={{ color: "#1a1a1a" }}>
                    {appointment.clients.email}
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Piano */}
        {appointment.pianos && (
          <div className="record-section">
            <div className="record-section-header">
              <h2>Piano</h2>
            </div>
            <div className="record-grid">
              <div className="record-field">
                <span className="record-label">Make & Model</span>
                <span className="record-value">
                  {[appointment.pianos.make, appointment.pianos.model].filter(Boolean).join(" ") || "—"}
                </span>
              </div>
              {appointment.pianos.type && (
                <div className="record-field">
                  <span className="record-label">Type</span>
                  <span className="record-value">{appointment.pianos.type}</span>
                </div>
              )}
              {appointment.pianos.serial_number && (
                <div className="record-field">
                  <span className="record-label">Serial Number</span>
                  <span className="record-value">{appointment.pianos.serial_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conditions */}
        {(appointment.temperature_f || appointment.humidity_percent) && (
          <div className="record-section">
            <div className="record-section-header">
              <h2>Conditions</h2>
            </div>
            <div className="record-grid">
              {appointment.temperature_f && (
                <div className="record-field">
                  <span className="record-label">Temperature</span>
                  <span className="record-value">{appointment.temperature_f}°F</span>
                </div>
              )}
              {appointment.humidity_percent && (
                <div className="record-field">
                  <span className="record-label">Humidity</span>
                  <span className="record-value">{appointment.humidity_percent}%</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
} 