import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../lib/supabase";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardContent from "../components/DashboardContent";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      // No authenticated user
      if (error || !user) {
        setLocation("/login");
        return;
      }

      // Authenticated but email is not confirmed
      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();

        if (mounted) {
          setLocation("/login");
        }

        return;
      }

      // Authenticated + verified
      setUserEmail(user.email ?? "");
      setLoading(false);
    }

    checkUser();

    return () => {
      mounted = false;
    };
  }, [setLocation]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setLocation("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090f]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />

          <p className="text-slate-400">
            Loading Workivo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#09090f] text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Topbar
          email={userEmail}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}
