"use client";

import AdminHeader from "../../../../AdminHeader";
import { useEffect, useState } from "react";
import { createClient } from "../../../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
};

export default function EditPiano() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const pianoid = params.pianoid as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    make: "",
    model: "",
    serial_number: "",
    type: "",
    notes: "",
    has_life_saver: false,
    is_active: true,
  });

  // Transfer modal state
  const [showTransfer, setShowTransfer] = useState(false);
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchPiano();
      }
    });
  }, [router]);

  async function fetchPiano() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pianos")
      .select("*")
      .eq("id", pianoid)
      .single();

    if (data) {
      setForm({
        make: data.make || "",
        model: data.model || "",
        serial_number: data.serial_number || "",
        type: data.type || "",
        notes: data.notes || "",
        has_life_saver: data.has_life_saver || false,
        is_active: data.is_active ?? true,
      });
    }
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.checked });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("pianos")
      .update({
        make: form.make || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        type: form.type || null,
        notes: form.notes || null,
        has_life_saver: form.has_life_saver,
        is_active: form.is_active,
      })
      .eq("id", pianoid);

    if (error) {
      setError("Error saving changes. Please try again.");
      setSaving(false);
    } else {
      router.push(`/admin/clients/${id}`);
    }
  }

  async function openTransferModal() {
    setTransferError("");
    setTransferTargetId("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, company_name")
      .neq("id", id)
      .order("last_name", { ascending: true });

    if (error) {
      setTransferError("Could not load clients. Please try again.");
      return;
    }

    setAllClients((data as ClientOption[]) || []);
    setShowTransfer(true);
  }

  function clientLabel(c: ClientOption) {
    if (c.company_name) return c.company_name;
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  async function confirmTransfer() {
    if (!transferTargetId) {
      setTransferError("Please select a client to transfer this piano to.");
      return;
    }

    const target = allClients.find((c) => c.id === transferTargetId);
    if (!target) {
      setTransferError("Selected client not found. Please try again.");
      return;
    }

    if (!confirm(
      `Transfer this piano to ${clientLabel(target)}?\n\n` +
      `Past appointments and invoices will remain with the current client. ` +
      `Only this piano record (and any future appointments using it) will move.`
    )) {
      return;
    }

    setTransferring(true);
    setTransferError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("pianos")
      .update({ client_id: transferTargetId })
      .eq("id", pianoid);

    if (error) {
      setTransferError("Error transferring piano. Please try again.");
      setTransferring(false);
      return;
    }

    // Redirect to the new client's detail page so the user sees the piano in its new home
    router.push(`/admin/clients/${transferTargetId}`);
  }

  if (loading) return <div className="admin-loading">Loading piano...</div>;
  return (
    <div className="admin-wrapper">
      <AdminHeader title="Edit Piano" />
      <div className="admin-content">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-section">
            <h2 className="form-section-title">Piano Details</h2>
            <div className="form-row">
              <div className="form-field">
                <label>Make</label>
                <input
                  name="make"
                  value={form.make}
                  onChange={handleChange}
                  placeholder="e.g. Steinway, Yamaha"
                />
              </div>
              <div className="form-field">
                <label>Model</label>
                <input
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  placeholder="e.g. Model B, U1"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Serial Number</label>
                <input
                  name="serial_number"
                  value={form.serial_number}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label>Type</label>
                <input
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  placeholder="e.g. Grand, Upright, Baby Grand"
                />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="has_life_saver"
                  checked={form.has_life_saver}
                  onChange={handleCheckbox}
                  style={{ width: "16px", height: "16px" }}
                />
                Piano Life Saver System installed
              </label>
            </div>
            <div className="form-field" style={{ marginTop: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={!form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: !e.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                Mark this piano as Inactive (decommissioned, sold, etc.)
              </label>
            </div>
          </div>
          <div className="form-section">
            <h2 className="form-section-title">Notes</h2>
            <div className="form-field">
              <label>Piano Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Any notes about this piano — condition, history, special considerations..."
              />
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Ownership</h2>
            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
              Transfer this piano to a different client. Past appointments and invoices stay with the current owner.
            </p>
            <button
              type="button"
              onClick={openTransferModal}
              className="admin-btn-outline"
            >
              Transfer to another client
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link href={`/admin/clients/${id}`} className="admin-btn-outline">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Transfer modal */}
        {showTransfer && (
          <div
            onClick={() => !transferring && setShowTransfer(false)}
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
                maxWidth: "450px",
                width: "90%",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Transfer Piano</h3>
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
                Select the client this piano is being transferred to.
              </p>

              <div className="form-field">
                <label>New Owner</label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  disabled={transferring}
                >
                  <option value="">Select a client...</option>
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>{clientLabel(c)}</option>
                  ))}
                </select>
              </div>

              {transferError && <p className="form-error">{transferError}</p>}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  disabled={transferring}
                  className="admin-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmTransfer}
                  disabled={transferring || !transferTargetId}
                  className="admin-btn"
                >
                  {transferring ? "Transferring..." : "Transfer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}