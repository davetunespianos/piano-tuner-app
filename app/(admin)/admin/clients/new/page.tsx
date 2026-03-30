"use client";

import { useState } from "react";
import { createClient } from "../../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.from("clients").insert([{
      company_name: form.company_name || null,
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      notes: form.notes || null,
    }]);

    if (error) {
      setError("Error saving client. Please try again.");
      setLoading(false);
    } else {
      router.push("/admin/clients");
    }
  }
  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>Add New Client</h1>
        <Link href="/admin/clients" className="admin-back">Back to Clients</Link>
      </div>
      <div className="admin-content">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-section">
            <h2 className="form-section-title">Business / Organization</h2>
            <div className="form-field">
              <label>Company Name <span className="form-optional">(leave blank for residential clients)</span></label>
              <input name="company_name" value={form.company_name} onChange={handleChange} placeholder="e.g. Fairfield Baptist Church" />
            </div>
          </div>
          <div className="form-section">
            <h2 className="form-section-title">Contact Person</h2>
            <div className="form-row">
              <div className="form-field">
                <label>First Name <span className="form-required">*</span></label>
                <input name="first_name" value={form.first_name} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Last Name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 734-555-0100" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="form-section">
            <h2 className="form-section-title">Address</h2>
            <div className="form-field">
              <label>Street Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>City</label>
                <input name="city" value={form.city} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>State</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="e.g. MI" />
              </div>
              <div className="form-field">
                <label>ZIP</label>
                <input name="zip" value={form.zip} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="form-section">
            <h2 className="form-section-title">Notes</h2>
            <div className="form-field">
              <label>Client Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="Any notes about this client..." />
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link href="/admin/clients" className="admin-back">Cancel</Link>
            <button type="submit" className="admin-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}