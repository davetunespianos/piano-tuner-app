"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditClient() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setForm({
        company_name: data.company_name || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        notes: data.notes || "",
      });
    }
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.target.name === "phone") {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
      let formatted = digits;
      if (digits.length >= 7) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length >= 4) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length >= 1) {
        formatted = `(${digits}`;
      }
      setForm({ ...form, phone: formatted });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("clients")
      .update({
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
      })
      .eq("id", id);

    if (error) {
      setError("Error saving changes. Please try again.");
      setSaving(false);
    } else {
      router.push(`/admin/clients/${id}`);
    }
  }

  if (loading) return <div className="admin-loading">Loading client...</div>;
 return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>Edit Client</h1>
        <Link href={`/admin/clients/${id}`} className="admin-back">Cancel</Link>
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
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. (734) 555-0100" />
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