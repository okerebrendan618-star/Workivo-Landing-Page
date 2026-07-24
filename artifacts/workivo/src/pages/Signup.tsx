export default function Signup() {
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
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-white outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-white outline-none"
          />

          <button
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
