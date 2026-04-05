"use client";

import { useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AVAILABLE_TIMES = ["09:00", "12:00", "15:00"];

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${minutes} ${ampm}`;
}

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function isSaturday(date: Date) {
  return date.getDay() === 6;
}

export default function BookPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date: "",
    time: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "MI",
    zip: "",
    piano_make: "",
    piano_model: "",
    piano_type: "",
    notes: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
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

  async function handleDateChange(date: Date | null) {
    setSelectedDate(date);
    setForm({ ...form, date: date ? date.toISOString().split("T")[0] : "", time: "" });

    if (!date) return;

    setLoadingTimes(true);
    try {
      const dateStr = date.toISOString().split("T")[0];
      const res = await fetch(`/api/availability?date=${dateStr}`);
      const data = await res.json();
      setAvailableTimes(data.availableTimes || []);
    } catch {
      setAvailableTimes(AVAILABLE_TIMES);
    }
    setLoadingTimes(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, service_type: "Standard Tuning" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }
  if (submitted) {
    return (
      <main className="page-content">
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <h2 style={{ marginBottom: "1rem" }}>Appointment Requested!</h2>
          <p>Thank you, {form.first_name}. Your appointment request has been received for:</p>
          <p style={{ fontWeight: 600, margin: "1rem 0" }}>
            {selectedDate?.toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric"
            })} at {formatTime(form.time)}
          </p>
          <p>A confirmation email will be sent to {form.email}.</p>
          <Link href="/" style={{ color: "#1a1a1a", marginTop: "2rem", display: "inline-block" }}>
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-content">
      <h2>Request an Appointment</h2>
      <p style={{ marginBottom: "2rem" }}>
        Please fill out the form below to request an appointment and Dave will confirm your appointment by email.
      </p>

      <form onSubmit={handleSubmit}>

        {/* Date & Time */}
        <div className="form-section">
          <h2 className="form-section-title">Select a Date & Time</h2>
          <div className="form-field">
            <label>Select a Date <span className="form-required">*</span></label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              filterDate={isSaturday}
              minDate={getMinDate()}
              placeholderText="Click to select a date"
              dateFormat="MMMM d, yyyy"
              className="datepicker-input"
            />
          </div>
          {selectedDate && (
            <div className="form-field">
              <label>Available Times <span className="form-required">*</span></label>
              {loadingTimes ? (
                <p style={{ color: "#888", fontSize: "0.9rem" }}>Checking availability...</p>
              ) : availableTimes.length === 0 ? (
                <p style={{ color: "#c62828", fontSize: "0.9rem" }}>
                  No times available on this date. Please select another date.
                </p>
              ) : (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {availableTimes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, time: t })}
                      style={{
                        padding: "0.6rem 1.5rem",
                        border: form.time === t ? "2px solid #1a1a1a" : "1px solid #ddd",
                        borderRadius: "6px",
                        background: form.time === t ? "#1a1a1a" : "#fff",
                        color: form.time === t ? "#fff" : "#1a1a1a",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "0.95rem",
                        fontWeight: form.time === t ? 600 : 400,
                      }}
                    >
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="form-field" style={{ marginTop: "1rem" }}>
            <label>Additional Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Anything Dave should know in advance..."
            />
          </div>
        </div>

        {/* Your Information */}
        <div className="form-section">
          <h2 className="form-section-title">Your Information</h2>
          <div className="form-row">
            <div className="form-field">
              <label>First Name <span className="form-required">*</span></label>
              <input name="first_name" value={form.first_name} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Last Name <span className="form-required">*</span></label>
              <input name="last_name" value={form.last_name} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Email <span className="form-required">*</span></label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>Phone <span className="form-required">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} required placeholder="e.g. (734) 555-0100" />
            </div>
          </div>
          <div className="form-field">
            <label>Street Address <span className="form-required">*</span></label>
            <input name="address" value={form.address} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>City <span className="form-required">*</span></label>
              <input name="city" value={form.city} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label>State</label>
              <input name="state" value={form.state} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label>ZIP <span className="form-required">*</span></label>
              <input name="zip" value={form.zip} onChange={handleChange} required />
            </div>
          </div>
        </div>

        {/* Piano Information */}
        <div className="form-section">
          <h2 className="form-section-title">Piano Information</h2>
          <p style={{ color: "#888", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Please enter the following information if you know it.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label>Make</label>
              <input name="piano_make" value={form.piano_make} onChange={handleChange} placeholder="e.g. Yamaha, Steinway" />
            </div>
            <div className="form-field">
              <label>Model</label>
              <input name="piano_model" value={form.piano_model} onChange={handleChange} placeholder="e.g. U1, Model B" />
            </div>
            <div className="form-field">
              <label>Type</label>
              <input name="piano_type" value={form.piano_type} onChange={handleChange} placeholder="e.g. Upright, Grand" />
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button
            type="submit"
            className="hero-btn"
            disabled={!form.date || !form.time || submitting}
            style={{
              background: "#1a1a1a",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              opacity: (!form.date || !form.time) ? 0.5 : 1
            }}
          >
            {submitting ? "Submitting..." : "Request Appointment"}
          </button>
        </div>

      </form>
    </main>
  );
}