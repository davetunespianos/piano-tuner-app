"use client";

import AdminHeader from "../../../../AdminHeader";
import { useEffect, useState } from "react";
import { createClient } from "../../../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
  });

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
      })
      .eq("id", pianoid);

    if (error) {
      setError("Error saving changes. Please try again.");
      setSaving(false);
    } else {
      router.push(`/admin/clients/${id}`);
    }
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
                  name="description"
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
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link href={`/admin/clients/${id}`} className="admin-btn-outline">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 