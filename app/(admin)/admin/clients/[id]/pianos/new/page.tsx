"use client";

import AdminHeader from "../../../../AdminHeader";
import { useState } from "react";
import { createClient } from "../../../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function NewPiano() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    make: "",
    model: "",
    serial_number: "",
    type: "",
    notes: "",
    has_life_saver: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.checked });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.from("pianos").insert([{
      client_id: id,
      make: form.make || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      type: form.type || null,
      notes: form.notes || null,
      has_life_saver: form.has_life_saver,
    }]);

    if (error) {
      setError("Error saving piano. Please try again.");
      setLoading(false);
    } else {
      router.push(`/admin/clients/${id}`);
    }
  }
 return (
    <div className="admin-wrapper">
      <AdminHeader title="Add Piano" />
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
                  placeholder="e.g. Grand, Upright, etc."
                />
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
                  Piano Life Saver System Installed
                </label>
              </div>  
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
            <Link href={`/admin/clients/${id}`} className="admin-back">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Piano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 