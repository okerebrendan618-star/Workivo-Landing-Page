import { Bell, Search, Sparkles, LogOut } from "lucide-react";

interface TopbarProps {
  email: string;
  onLogout: () => void;
}

export default function Topbar({ email, onLogout }: TopbarProps) {
  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good Morning ☀️"
      : hour < 18
      ? "Good Afternoon 🌤️"
      : "Good Evening 🌙";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090f]/80 backdrop-blur-xl">

      <div className="flex items-center justify-between px-8 py-6">

        {/* Left */}

        <div>

          <p className="text-sm text-slate-400">
            {greeting}
          </p>

          <h1 className="mt-1 text-3xl font-bold text-white">
            Welcome back
          </h1>

          <p className="mt-2 text-slate-400">
            {email}
          </p>

        </div>


        {/* Right */}

        <div className="flex items-center gap-4">

          {/* Search */}

          <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">

            <Search className="h-4 w-4 text-slate-400" />

            <input
              placeholder="Search..."
              className="w-44 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
            />

          </div>


          {/* Free Plan */}

          <div className="hidden md:flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">

            <Sparkles className="h-4 w-4" />

            Free Plan

          </div>


          {/* Notification */}

          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10">

            <Bell className="h-5 w-5 text-white" />

          </button>


          {/* Logout */}

          <button
            onClick={onLogout}
            className="hidden md:flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >

            <LogOut className="h-4 w-4" />

            Logout

          </button>


          {/* Avatar */}

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">

            {email.charAt(0).toUpperCase()}

          </div>


        </div>

      </div>

    </header>
  );
}
