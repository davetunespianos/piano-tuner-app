"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "../AdminHeader";
import Link from "next/link";

type ImportResult = {
  clientsImported: number;
  clientsSkipped: number;
  pianosImported: number;
  pianosSkipped: number;
  errors: string[];
};

export default function ImportPage() {
  const router = useRouter();
  const [clientFile, setClientFile] = useState<File | null>(null);
  const [pianoFile, setPianoFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  function handleClientFile(e: React.ChangeEvent<HTMLInputElement>) {
    setClientFile(e.target.files?.[0] || null);
  }

  function handlePianoFile(e: React.ChangeEvent<HTMLInputElement>) {
    setPianoFile(e.target.files?.[0] || null);
  }

  async function handleImport() {
    if (!clientFile && !pianoFile) {
      setError("Please select at least one file to import.");
      return;
    }

    setImporting(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    if (clientFile) formData.append("clients", clientFile);
    if (pianoFile) formData.append("pianos", pianoFile);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }

    setImporting(false);
  }
  return (
    <div className="admin-wrapper">
      <AdminHeader title="Import Data" />
      <div className="admin-content">

        {result ? (
          <div className="record-section">
            <h2 style={{ marginBottom: "1.5rem", fontSize: "1.2rem", fontWeight: 600 }}>
              Import Complete
            </h2>
            <div className="dashboard-grid" style={{ marginBottom: "1.5rem" }}>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Clients Imported</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", color: "#2e7d32" }}>
                  {result.clientsImported}
                </div>
              </div>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Clients Skipped</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", color: "#888" }}>
                  {result.clientsSkipped}
                </div>
              </div>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Pianos Imported</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", color: "#2e7d32" }}>
                  {result.pianosImported}
                </div>
              </div>
              <div className="dashboard-card" style={{ pointerEvents: "none" }}>
                <div className="dashboard-card-sub">Pianos Skipped</div>
                <div className="dashboard-card-title" style={{ fontSize: "1.5rem", color: "#888" }}>
                  {result.pianosSkipped}
                </div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontWeight: 600, color: "#c62828", marginBottom: "0.5rem" }}>
                  Errors ({result.errors.length}):
                </p>
                <ul style={{ fontSize: "0.85rem", color: "#c62828", paddingLeft: "1.5rem" }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <div className="form-actions">
              <button
                onClick={() => setResult(null)}
                className="admin-btn-outline"
              >
                Import More
              </button>
              <Link href="/admin/clients" className="admin-btn">
                View Clients
              </Link>
            </div>
          </div>
        ) : (
          <div className="record-section" style={{ maxWidth: "600px" }}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1.1rem", fontWeight: 600 }}>
              Import from Gazelle CSV Export
            </h2>
            <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "2rem" }}>
              Export your Client List and Piano List CSVs from Gazelle and upload them here.
              Clients already in the system (matched by email) will be skipped.
              Pianos will be linked to their clients automatically using the Gazelle Client ID.
            </p>

            <div className="form-section">
              <h2 className="form-section-title">Step 1 — Client List CSV</h2>
              <div className="form-field">
                <label>Select Client_List.csv from Gazelle</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleClientFile}
                  style={{ fontSize: "0.9rem", fontFamily: "inherit" }}
                />
                {clientFile && (
                  <p style={{ fontSize: "0.8rem", color: "#2e7d32", marginTop: "0.4rem" }}>
                    {clientFile.name} selected
                  </p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Step 2 — Piano List CSV</h2>
              <div className="form-field">
                <label>Select Piano_List.csv from Gazelle</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handlePianoFile}
                  style={{ fontSize: "0.9rem", fontFamily: "inherit" }}
                />
                {pianoFile && (
                  <p style={{ fontSize: "0.8rem", color: "#2e7d32", marginTop: "0.4rem" }}>
                    {pianoFile.name} selected
                  </p>
                )}
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="form-actions">
              <button
                onClick={handleImport}
                className="admin-btn"
                disabled={importing || (!clientFile && !pianoFile)}
              >
                {importing ? "Importing..." : "Start Import"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}