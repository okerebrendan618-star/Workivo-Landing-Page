import {
  FileText,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Crown,
  CheckCircle2,
  Zap,
  Bot,
  Activity,
  ArrowUpRight,
} from "lucide-react";

import { useRef, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function DashboardContent() {
  const [latestResume, setLatestResume] = useState<any>(null);
  const [resumeCount, setResumeCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  useEffect(() => {
  const getLatestResume = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setLatestResume(data);
    }
    const { count } = await supabase
  .from("resumes")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);

setResumeCount(count || 0);
  };

  getLatestResume();
}, []);

  const handleFileUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) return;
  
    

  const fileName = `${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("resumes")
    .upload(fileName, file);

  if (error) {
    console.error(error);

alert(error.message);
    return;
  }

  console.log("Upload successful:", data);


// Get logged in user
const {
  data: { user },
} = await supabase.auth.getUser();


if (!user) {
  alert("Please login first");
  return;
}


// Get uploaded file URL

const { data: urlData } = supabase.storage
  .from("resumes")
  .getPublicUrl(fileName);


// Save resume information

const { error: databaseError } = await supabase
  .from("resumes")
  .insert({
    user_id: user.id,
    file_name: fileName,
    file_url: urlData.publicUrl,
  });


if (databaseError) {
  console.error(databaseError);
  alert(databaseError.message);
  return;
}
setLatestResume({
  file_name: fileName,
  file_url: urlData.publicUrl,
});
setResumeCount((prev) => prev + 1);
alert("Resume uploaded and saved successfully!");

   
};
  return (
    <main className="space-y-8">

      {/* HERO */}

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/10 p-8 shadow-2xl">

        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-black/20 to-transparent" />

        <div className="relative z-10">

          <div className="flex flex-wrap items-center gap-3">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">

              <Sparkles className="h-7 w-7 text-indigo-300" />

            </div>

            <div>

              <div className="mb-2 inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">

                ✨ Workivo AI v2.0

              </div>

              <h2 className="text-3xl font-bold text-white">

                Your Resume Co-pilot is ready 🚀

              </h2>

            </div>

          </div>

          <p className="mt-6 max-w-2xl text-slate-300 leading-7">

            Upload your resume and let Workivo analyse your ATS score,
            optimise your content and match you with better career opportunities.

          </p>

          <div className="mt-8 flex flex-wrap gap-4">

            <button
  onClick={handleUploadClick}
  className="flex items-center gap-3 rounded-2xl bg-white px-7 py-3 font-semibold text-indigo-700 transition hover:scale-105"
>
  <UploadCloud className="h-5 w-5" />
  Upload Resume
</button>

            <button className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-7 py-3 font-semibold text-white transition hover:bg-white/10">

              <ArrowUpRight className="h-5 w-5" />

              View Career Insights

            </button>

          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

              <p className="text-xs uppercase tracking-widest text-slate-500">

                Last Upload

              </p>

              <p className="mt-2 text-white font-semibold">
 {latestResume
   ? latestResume.file_name
   : "No resume uploaded"}
</p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

              <p className="text-xs uppercase tracking-widest text-slate-500">

                ATS Status

              </p>

              <p className="mt-2 text-white font-semibold">
  {resumeCount > 0 ? "Resume uploaded" : "Waiting for first scan"}
</p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

              <p className="text-xs uppercase tracking-widest text-slate-500">

                AI Assistant

              </p>

              <p className="mt-2 text-emerald-400 font-semibold">

                Ready to help

              </p>

            </div>

          </div>

        </div>

      </section>

      {/* Premium Stats */}

      <section className="grid gap-6 md:grid-cols-3">

        {/* ATS Score */}

        <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-indigo-500/40 hover:shadow-[0_0_40px_rgba(99,102,241,0.25)]">

          <div className="flex items-center justify-between">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">

              <FileText className="h-6 w-6 text-indigo-400" />

            </div>

            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">

              ATS SCORE

            </span>

          </div>

         <h2 className="mt-6 text-5xl font-black text-white">
  {resumeCount}
</h2> 

          <p className="mt-2 text-slate-400">
            Upload a resume to receive your first ATS score.
          </p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">

            <div className="h-full w-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>

          </div>

        </div>



        {/* Resume Tailored */}

        <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-purple-500/40 hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]">

          <div className="flex items-center justify-between">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">

              <Sparkles className="h-6 w-6 text-purple-400" />

            </div>

            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">

              RESUMES

            </span>

          </div>

          <h2 className="mt-6 text-5xl font-black text-white">
            0
          </h2>

          <p className="mt-2 text-slate-400">
            AI Tailored Resumes Generated
          </p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">

            <div className="h-full w-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>

          </div>

        </div>



        {/* Applications */}

        <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-emerald-500/40 hover:shadow-[0_0_40px_rgba(34,197,94,0.25)]">

          <div className="flex items-center justify-between">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">

              <TrendingUp className="h-6 w-6 text-emerald-400" />

            </div>

            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">

              APPLICATIONS

            </span>

          </div>

          <h2 className="mt-6 text-5xl font-black text-white">
            0
          </h2>

          <p className="mt-2 text-slate-400">
            Active Job Applications
          </p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">

            <div className="h-full w-0 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"></div>

          </div>

        </div>

      </section>



      {/* Resume Upload */}

      <section className="rounded-3xl border border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-10">

        <div className="flex flex-col items-center text-center">

          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20">

            <UploadCloud className="h-10 w-10 text-indigo-300" />

          </div>

          <h2 className="mt-6 text-3xl font-bold text-white">

            Drop your resume here

          </h2>

          <p className="mt-3 max-w-xl text-slate-400">

            Supports PDF and DOCX files.
            Our AI instantly analyses your resume,
            calculates your ATS score,
            and suggests improvements.

          </p>

          <input
  ref={fileInputRef}
  type="file"
  accept=".pdf,.doc,.docx"
  className="hidden"
  onChange={handleFileUpload}
/>


<button
  onClick={handleUploadClick}
  className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 font-semibold text-white transition hover:scale-105"
>

  Upload Resume

</button>

        </div>

      </section>

      {/* Recent Activity */}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <Activity className="h-6 w-6 text-indigo-400" />

          <h2 className="text-xl font-bold text-white">

            Recent Activity

          </h2>

        </div>


        <div className="mt-6 space-y-4">


          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">

              <UploadCloud className="h-5 w-5 text-indigo-300" />

            </div>

            <div>

              <p className="font-medium text-white">

                Resume uploaded

              </p>

              <p className="text-sm text-slate-400">

                Waiting for your first ATS analysis

              </p>

            </div>

          </div>



          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">

              <CheckCircle2 className="h-5 w-5 text-emerald-400" />

            </div>

            <div>

              <p className="font-medium text-white">

                ATS scan completed

              </p>

              <p className="text-sm text-slate-400">

                Your resume score will appear here

              </p>

            </div>

          </div>



          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">

              <Sparkles className="h-5 w-5 text-purple-400" />

            </div>

            <div>

              <p className="font-medium text-white">

                Resume tailored

              </p>

              <p className="text-sm text-slate-400">

                AI improvements ready

              </p>

            </div>

          </div>


        </div>

      </section>



      {/* AI Suggestions */}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">


        <div className="flex items-center gap-3">

          <Zap className="h-6 w-6 text-yellow-400" />

          <div>

            <h2 className="text-xl font-bold text-white">

              AI Career Suggestions

            </h2>

            <p className="text-sm text-slate-400">

              Powered by Workivo intelligence

            </p>

          </div>

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
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">

                <CheckCircle2 className="h-5 w-5 text-green-400" />

              </div>


              <p className="text-slate-300 group-hover:text-white transition">

                {item}

              </p>


            </div>

          ))}


        </div>


      </section>

      {/* Plan Section */}

      <section className="grid gap-6 lg:grid-cols-2">


        {/* Free Plan */}

        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-8 backdrop-blur-xl">


          <div className="flex items-center gap-3">

            <Sparkles className="h-6 w-6 text-indigo-300" />

            <h2 className="text-xl font-bold text-white">

              Free Plan

            </h2>

          </div>


          <p className="mt-4 text-slate-300">

            Everything you need to start improving your career.

          </p>



          <div className="mt-6 space-y-3">


            {[
              "3 ATS resume scans",
              "3 AI resume improvements",
              "Job matching preview",
              "Career suggestions",
            ].map((item) => (

              <div
                key={item}
                className="flex items-center gap-3 text-slate-200"
              >

                <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                {item}

              </div>

            ))}


          </div>


          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">


            <p className="text-sm text-slate-400">

              Monthly AI Credits

            </p>


            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">


              <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />


            </div>


            <p className="mt-2 text-xs text-slate-400">

              30% used

            </p>


          </div>


        </div>




        {/* Upgrade */}

        <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent p-8">


          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-400/20 blur-3xl" />


          <div className="relative">


            <div className="flex items-center gap-3">


              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/20">

                <Crown className="h-6 w-6 text-yellow-400" />

              </div>


              <h2 className="text-xl font-bold text-white">

                Upgrade to Pro

              </h2>


            </div>



            <p className="mt-5 text-slate-300">

              Unlock unlimited AI career tools and maximize your chances of getting hired.

            </p>



            <ul className="mt-6 space-y-3">


              {[
                "Unlimited ATS scans",
                "Advanced AI resume rewriting",
                "Smart job matching",
                "Priority AI assistance",
              ].map((item) => (

                <li
                  key={item}
                  className="flex items-center gap-3 text-slate-200"
                >

                  <CheckCircle2 className="h-5 w-5 text-yellow-400" />

                  {item}

                </li>

              ))}


            </ul>



            <button className="mt-8 rounded-2xl bg-yellow-400 px-8 py-3 font-bold text-black transition hover:scale-105 hover:bg-yellow-300">

              Upgrade Now

            </button>


          </div>


        </div>


      </section>




      {/* Floating AI Assistant */}

      <button
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 font-semibold text-white shadow-2xl shadow-indigo-500/40 transition hover:scale-110"
      >

        <Bot className="h-5 w-5" />

        Ask Workivo AI

      </button>


    </main>
  );
}
