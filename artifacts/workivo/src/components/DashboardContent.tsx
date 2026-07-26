import {
  FileText,
  Sparkles,
  Briefcase,
  TrendingUp,
  UploadCloud,
  Crown,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function DashboardContent() {
  return (
    <main className="space-y-8">

      {/* Hero */}

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/10 p-8 shadow-2xl">

        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">

              <Sparkles className="h-6 w-6 text-indigo-300" />

            </div>

            <div>

              <p className="text-sm text-indigo-200">
                AI Career Assistant
              </p>

              <h2 className="text-3xl font-bold text-white">
                Your Resume Co-pilot is ready 🚀
              </h2>

            </div>

          </div>


          <p className="mt-5 max-w-2xl text-slate-300">

            Upload your resume and let Workivo analyze your ATS score,
            improve your content, and match you with better opportunities.

          </p>


          <button className="mt-8 flex items-center gap-3 rounded-2xl bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:scale-105">

            <UploadCloud className="h-5 w-5" />

            Upload Resume

          </button>

        </div>

      </section>



      {/* Stats */}

      <section className="grid gap-6 md:grid-cols-3">


        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <FileText className="h-6 w-6 text-indigo-400" />

            <span className="text-sm text-slate-400">
              ATS
            </span>

          </div>


          <h3 className="mt-6 text-4xl font-bold text-white">
            0%
          </h3>

          <p className="mt-2 text-slate-400">
            Resume compatibility
          </p>

        </div>



        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <Briefcase className="h-6 w-6 text-purple-400" />

            <span className="text-sm text-slate-400">
              Matches
            </span>

          </div>


          <h3 className="mt-6 text-4xl font-bold text-white">
            0
          </h3>

          <p className="mt-2 text-slate-400">
            Recommended jobs
          </p>

        </div>



        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <TrendingUp className="h-6 w-6 text-green-400" />

            <span className="text-sm text-slate-400">
              Applications
            </span>

          </div>


          <h3 className="mt-6 text-4xl font-bold text-white">
            0
          </h3>

          <p className="mt-2 text-slate-400">
            Jobs tracked
          </p>

        </div>


      </section>



      {/* AI Suggestions */}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">


        <div className="flex items-center gap-3">

          <Zap className="h-6 w-6 text-yellow-400" />

          <h2 className="text-xl font-bold text-white">
            AI Suggestions
          </h2>

        </div>


        <div className="mt-6 grid gap-4 md:grid-cols-2">


          {[
            "Add measurable achievements to your experience",
            "Improve your professional summary",
            "Increase ATS keyword matching",
            "Tailor your resume for specific jobs",
          ].map((item) => (

            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
            >

              <CheckCircle2 className="h-5 w-5 text-green-400" />

              <p className="text-slate-300">
                {item}
              </p>

            </div>

          ))}


        </div>

      </section>




      {/* Credits + Upgrade */}


      <section className="grid gap-6 lg:grid-cols-2">


        <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-8">


          <div className="flex items-center gap-3">

            <Sparkles className="h-6 w-6 text-indigo-300" />

            <h2 className="text-xl font-bold text-white">
              Free Plan
            </h2>

          </div>


          <p className="mt-4 text-slate-300">

            You have access to:

          </p>


          <ul className="mt-4 space-y-3 text-slate-200">

            <li>
              ✓ 3 ATS scans
            </li>

            <li>
              ✓ 3 AI resume improvements
            </li>

            <li>
              ✓ Job matching preview
            </li>

          </ul>


        </div>




        <div className="rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 p-8">


          <div className="flex items-center gap-3">

            <Crown className="h-6 w-6 text-yellow-400" />

            <h2 className="text-xl font-bold text-white">
              Upgrade to Pro
            </h2>

          </div>


          <p className="mt-4 text-slate-300">

            Unlock unlimited AI career tools and get hired faster.

          </p>


          <button className="mt-6 rounded-2xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:scale-105">

            Upgrade Now

          </button>


        </div>


      </section>


    </main>
  );
}
