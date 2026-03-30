"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = {
  id: string;
  company_name: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
};

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

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
    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name, first_name, last_name, email, phone, city, state")
      .order("last_name", { ascending: true });

    if (!error && data) setClients(data);
    setLoading(false);
  }

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(term) ||
      c.last_name?.toLowerCase().includes(term) ||
      c.company_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term)
    );
  });

  function displayName(c: Client) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  if (loading) return <div className="admin-loading">Loading clients...</div>;
  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>Clients</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/admin/dashboard" className="admin-back">Dashboard</Link>
          <Link href="/admin/clients/new" className="admin-btn">+ Add Client</Link>
        </div>
      </div>
      <div className="admin-content">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search"
        />
        {filtered.length === 0 ? (
          <p style={{ color: "#888", marginTop: "2rem" }}>
            {search ? "No clients match your search." : "No clients yet. Add your first client."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/admin/clients/${c.id}`)}
                  className="admin-table-row"
                >
                  <td>
                    <span className="client-name">{displayName(c)}</span>
                    {c.company_name && (
                      <span className="client-contact">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.city || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}