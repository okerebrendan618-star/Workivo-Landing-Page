import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";

export default function Signup() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup() {
  setLoading(true);
  setMessage("");

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log("Signup data:", data);
    console.log("Signup error:", error);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created successfully!");

    setTimeout(() => {
      setLocation("/dashboard");
    }, 1000);
  } catch (err) {
    console.error(err);
    setMessage(err instanceof Error ? err.message : "Unexpected error");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111119] p-8 shadow-xl">

        <h1 className="text-3xl font-bold text-white mb-2">
          Create your account
        </h1>

        <p className="text-slate-400 mb-8">
          Welcome to Workivo. Let's get you hired faster.
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
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

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
