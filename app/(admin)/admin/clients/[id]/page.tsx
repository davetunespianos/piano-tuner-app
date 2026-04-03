"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Client = {
  id: string;
  company_name: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
};

type Piano = {
  id: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  type: string | null;
  notes: string | null;
  has_life_saver: boolean;
};

type Appointment = {
  id: string;
  appointment_date: string;
  service_type: string;
  status: string;
};

export default function ClientRecord() {
  const [client, setClient] = useState<Client | null>(null);
  const [pianos, setPianos] = useState<Piano[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
        fetchClient();
      }
    });
  }, [router]);

  async function fetchClient() {
    const supabase = createClient();
    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    const { data: pianoData } = await supabase
      .from("pianos")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: true });

    const { data: apptData } = await supabase
      .from("appointments")
      .select("id, appointment_date, service_type, status")
      .eq("client_id", id)
      .order("appointment_date", { ascending: false });

      if (clientData) setClient(clientData);
      if (pianoData) setPianos(pianoData);
      if (apptData) setAppointments(apptData);
      setLoading(false);if (clientData) setClient(clientData);
      if (pianoData) setPianos(pianoData);
      setLoading(false);
  }

  function displayName(c: Client) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  function formatAddress(c: Client) {
    const parts = [c.address, c.city, c.state, c.zip].filter(Boolean);
    return parts.join(", ");
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (loading) return <div className="admin-loading">Loading client...</div>;
  if (!client) return <div className="admin-loading">Client not found.</div>;
 return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>{displayName(client)}</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/admin/clients" className="admin-back">Back to Clients</Link>
          <Link href={`/admin/clients/${id}/edit`} className="admin-btn">Edit Client</Link>
        </div>
      </div>
      <div className="admin-content">
        <div className="record-section">
          <div className="record-section-header">
            <h2>Client Details</h2>
          </div>
          <div className="record-grid">
            {client.company_name && (
              <div className="record-field">
                <span className="record-label">Company</span>
                <span className="record-value">{client.company_name}</span>
              </div>
            )}
            <div className="record-field">
              <span className="record-label">Contact Name</span>
              <span className="record-value">
                {[client.first_name, client.last_name].filter(Boolean).join(" ")}
              </span>
            </div>
            <div className="record-field">
              <span className="record-label">Phone</span>
              <span className="record-value">
                {client.phone
                  ? <a href={`tel:${client.phone}`} style={{ color: "#1a1a1a" }}>{client.phone}</a>
                  : "—"}
              </span>
            </div>
            <div className="record-field">
              <span className="record-label">Email</span>
              <span className="record-value">
                {client.email
                  ? <a href={`mailto:${client.email}`} style={{ color: "#1a1a1a" }}>{client.email}</a>
                  : "—"}
              </span>
            </div>
            <div className="record-field">
              <span className="record-label">Address</span>
              <span className="record-value">{formatAddress(client) || "—"}</span>
            </div>
          </div>
          {client.notes && (
            <div className="record-notes">
              <span className="record-label">Notes</span>
              <p>{client.notes}</p>
            </div>
          )}
        </div>
        <div className="record-section">
          <div className="record-section-header">
            <h2>Pianos</h2>
            <Link href={`/admin/clients/${id}/pianos/new`} className="admin-btn">+ Add Piano</Link>
          </div>
          {pianos.length === 0 ? (
            <p style={{ color: "#888" }}>No pianos on record yet.</p>
          ) : (
            <div className="piano-list">
              {pianos.map((p) => (
                <div key={p.id} className="piano-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="piano-name">
                        {[p.make, p.model].filter(Boolean).join(" ") || "Unnamed Piano"}
                      </div>
                      {p.type && <div className="piano-desc">{p.type}</div>}
                      {p.serial_number && (
                        <div className="piano-desc">Serial: {p.serial_number}</div>
                      )}
                      {p.has_life_saver && (
                        <div className="piano-detail" style={{ color: "#2e7d32", fontWeight: 600 }}>
                          Piano Life Saver installed
                        </div>
                      )}
                      {p.notes && <div className="piano-detail">{p.notes}</div>}
                    </div>
                    <Link
                      href={`/admin/clients/${id}/pianos/${p.id}`}
                      className="admin-btn-outline"
                      style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}
                    >
                      Edit
                    </Link>
                    <div className="record-section">
                      <div className="record-section-header">
                        <h2>Appointments</h2>
                        <Link href="/admin/appointments/new" className="admin-btn">+ New Appointment</Link>
                      </div>
                      {appointments.length === 0 ? (
                        <p style={{ color: "#888" }}>No appointments on record yet.</p>
                      ) : (
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Service</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {appointments.map((a) => (
                              <tr
                                key={a.id}
                                onClick={() => router.push(`/admin/appointments/${a.id}`)}
                                className="admin-table-row"
                              >
                                <td>{formatDate(a.appointment_date)}</td>
                                <td>{formatTime(a.appointment_date)}</td>
                                <td>{a.service_type}</td>
                                <td>
                                  <span className={`status-badge status-${a.status.toLowerCase()}`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 