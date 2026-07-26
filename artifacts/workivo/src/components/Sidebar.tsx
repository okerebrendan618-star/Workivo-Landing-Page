import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  Crown,
} from "lucide-react";

const menu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Resume",
    icon: FileText,
    href: "/resume",
  },
  {
    title: "AI Resume Coach",
    icon: Sparkles,
    href: "/ai",
  },
  {
    title: "Job Matches",
    icon: Briefcase,
    href: "/matches",
  },
  {
    title: "Applications",
    icon: BarChart3,
    href: "/applications",
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden lg:flex w-72 min-h-screen flex-col border-r border-white/10 bg-[#09090f]/90 backdrop-blur-xl">

      {/* Logo */}

      <div className="px-8 pt-8 pb-10">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/30">

            <Sparkles className="h-6 w-6 text-white" />

          </div>

          <div>

            <h1 className="text-xl font-bold tracking-wide text-white">

              WORKIVO

            </h1>

            <p className="text-xs text-slate-400">

              AI Career Co-pilot

            </p>

          </div>

        </div>

      </div>

      {/* Menu */}

      <div className="flex-1 px-4 space-y-2">

        {menu.map((item) => {
          const Icon = item.icon;

          const active = location === item.href;

          return (
            <Link key={item.href} href={item.href}>

              <div
                className={`group flex cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300

                ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >

                <Icon className="h-5 w-5" />

                <span className="font-medium">

                  {item.title}

                </span>

              </div>

            </Link>
          );
        })}

      </div>

      {/* Upgrade Card */}

      <div className="mx-5 mb-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 p-5">

        <div className="flex items-center gap-2">

          <Crown className="h-5 w-5 text-yellow-400" />

          <h3 className="font-semibold text-white">

            Upgrade to Pro

          </h3>

        </div>

        <p className="mt-3 text-sm text-slate-300">

          Unlimited ATS scans, AI resume tailoring, job matching and interview preparation.

        </p>

        <button className="mt-5 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500">

          Go Pro

        </button>

      </div>

      {/* Bottom */}

      <div className="border-t border-white/10 p-5 space-y-2">

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">

          <Settings className="h-5 w-5" />

          Settings

        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition hover:bg-red-500/10">

          <LogOut className="h-5 w-5" />

          Logout

        </button>

      </div>

    </aside>
  );
}
