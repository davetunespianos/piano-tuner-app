"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

export default function AdminHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <>
      <div className="admin-header">
        <h1>{title}</h1>
        <div className="admin-header-actions">
          {actions}
        </div>
        <button
          className="admin-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      {menuOpen && (
        <div className="admin-mobile-menu">
          <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          <Link href="/admin/clients" onClick={() => setMenuOpen(false)}>Clients</Link>
          <Link href="/admin/appointments" onClick={() => setMenuOpen(false)}>Appointments</Link>
          <Link href="/admin/invoices" onClick={() => setMenuOpen(false)}>Invoices</Link>
          <Link href="/admin/security" onClick={() => setMenuOpen(false)}>Security</Link>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      )}
    </>
  );
}