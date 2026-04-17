"use client";

import AdminHeader from "../AdminHeader";
import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  clients: {
    first_name: string;
    last_name: string | null;
    company_name: string | null;
  };
  appointment_pianos: {
    service_type: string;
    pianos: {
      make: string | null;
      model: string | null;
    } | null;
  }[];
};

export default function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchAppointments();
      }
    });
  }, [router]);

  async function fetchAppointments() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        status,
        notes,
        clients (first_name, last_name, company_name),
        appointment_pianos (service_type, pianos (make, model))
      `)
      .order("appointment_date", { ascending: true });

    console.log("appointments data:", data);
    console.log("appointments error:", error);

    if (!error && data) setAppointments(data as unknown as Appointment[]);
    setLoading(false);
  }

  function clientName(a: Appointment) {
    if (a.clients.company_name) return a.clients.company_name;
    return [a.clients.first_name, a.clients.last_name].filter(Boolean).join(" ");
  }

  function serviceTypes(a: Appointment) {
    if (!a.appointment_pianos || a.appointment_pianos.length === 0) return "—";
    return a.appointment_pianos.map((ap) => ap.service_type).join(", ");
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const filtered = appointments.filter((a) => {
    const date = new Date(a.appointment_date);
    if (filter === "upcoming") return date >= now;
    if (filter === "past") return date < now;
    return true;
  });

  if (loading) return <div className="admin-loading">Loading appointments...</div>;
 return (
    <div className="admin-wrapper">
      <AdminHeader
        title="Appointments"
        actions={
          <>
            <Link href="/admin/appointments/new" className="admin-btn">+ New Appointment</Link>
          </>
        }
      />
      <div className="admin-content">
        <div className="filter-tabs">
          <button
            className={filter === "upcoming" ? "filter-tab active" : "filter-tab"}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={filter === "past" ? "filter-tab active" : "filter-tab"}
            onClick={() => setFilter("past")}
          >
            Past
          </button>
          <button
            className={filter === "all" ? "filter-tab active" : "filter-tab"}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>
        {filtered.length === 0 ? (
          <p style={{ color: "#888", marginTop: "2rem" }}>
            {filter === "upcoming" ? "No upcoming appointments." : "No appointments found."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Client</th>
                <th>Services</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/admin/appointments/${a.id}`)}
                  className="admin-table-row"
                >
                  <td>{formatDate(a.appointment_date)}</td>
                  <td>{formatTime(a.appointment_date)}</td>
                  <td>{clientName(a)}</td>
                  <td>{serviceTypes(a)}</td>
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
  );
} 