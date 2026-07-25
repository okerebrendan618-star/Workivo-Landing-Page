export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-6 py-8">

      {/* Header */}
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-10">

          <div>
            <h1 className="text-3xl font-bold">
              Welcome back 👋
            </h1>

            <p className="text-slate-400 mt-2">
              Your AI Resume Co-pilot is ready.
            </p>
          </div>


          <button className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 hover:bg-white/10 transition">
            Logout
          </button>

        </div>


        {/* AI Status Card */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-8 mb-8 shadow-xl">

          <h2 className="text-2xl font-semibold mb-3">
            🚀 AI Career Assistant
          </h2>

          <p className="text-slate-300">
            Upload your resume and let Workivo analyze, improve and match you with jobs.
          </p>

          <button className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition">
            Analyze Resume
          </button>

        </div>



        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">


          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">

            <h3 className="text-lg font-semibold">
              📄 Resume Score
            </h3>

            <p className="text-4xl font-bold mt-4">
              0%
            </p>

            <p className="text-slate-400 mt-2">
              ATS compatibility
            </p>

          </div>



          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">

            <h3 className="text-lg font-semibold">
              🎯 Job Matches
            </h3>

            <p className="text-4xl font-bold mt-4">
              0
            </p>

            <p className="text-slate-400 mt-2">
              Recommended roles
            </p>

          </div>



          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">

            <h3 className="text-lg font-semibold">
              📌 Applications
            </h3>

            <p className="text-4xl font-bold mt-4">
              0
            </p>

            <p className="text-slate-400 mt-2">
              Jobs tracked
            </p>

          </div>


        </div>

      </div>

    </div>
  );
}
