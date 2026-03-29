"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) return <div className="admin-loading">Loading...</div>;

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleSignOut} className="signout-btn">Sign Out</button>
      </div>
      <div className="admin-content">
        <p>Welcome, Dave. Your dashboard is ready to be built out.</p>
      </div>
    </div>
  );
}