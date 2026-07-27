import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      console.log("Login data:", data);
      console.log("Login error:", error);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Login successful!");

      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);

    } catch (err) {
      console.error(err);
      setMessage(
        err instanceof Error ? err.message : "Unexpected error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111119] p-8 shadow-xl">

        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back
        </h1>

        <p className="text-slate-400 mb-8">
          Sign in to continue building your career with Workivo.
        </p>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-white outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-white outline-none"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div className="flex justify-between text-sm">

            <button
              onClick={() => setLocation("/signup")}
              className="text-indigo-400 hover:text-indigo-300 transition"
            >
              Create an account
            </button>

            <button
              className="text-slate-400 hover:text-white transition"
            >
              Forgot Password?
            </button>

          </div>

          {message && (
            <p className="text-sm text-slate-300 text-center">
              {message}
            </p>
          )}

        </div>

      </div>

    </div>
  );
}
