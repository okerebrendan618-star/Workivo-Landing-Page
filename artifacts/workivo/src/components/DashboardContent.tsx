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
import { extractPdfText } from "../lib/pdfReader";

export default function DashboardContent() {
  const [latestResume, setLatestResume] = useState<any>(null);
const [resumeCount, setResumeCount] = useState(0);
const [isScanning, setIsScanning] = useState(false);

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/hy6c1fbiuwhk1iyjfm48defjdrb0577l";


  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };


  // LOAD USER RESUME AFTER REFRESH
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
        .maybeSingle();


      if (!error && data) {
        setLatestResume(data);
      }


      const { count } = await supabase
        .from("resumes")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id);


      setResumeCount(count || 0);

    };


    getLatestResume();

  }, []);



  // UPLOAD RESUME
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    console.log("UPLOAD STARTED");
alert("UPLOAD STARTED");

    const file = event.target.files?.[0];

if (!file) {
  alert("NO FILE FOUND");
  return;
}

alert(`FILE FOUND: ${file.name}`);


    
    let resumeText = "";

try {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    alert("Please upload a PDF resume.");
    return;
  }

  alert("PDF detected. Starting text extraction...");

  resumeText = await extractPdfText(file);

  alert(`PDF text extracted: ${resumeText.length} characters`);

  if (!resumeText.trim()) {
    alert(
      "PDF was opened, but no selectable text was found. Please upload a text-based PDF."
    );
    return;
  }

} catch (error) {
  console.error("PDF EXTRACTION ERROR:", error);

  alert(
    `PDF text extraction failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );

  return;
}


    const fileName = `${Date.now()}-${file.name}`;
    alert("ABOUT TO UPLOAD TO SUPABASE STORAGE");



    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, file);
    if (uploadError) {
  console.log(uploadError);
  alert(uploadError.message);
  return;
}

alert("UPLOAD TO STORAGE SUCCESSFUL");



    if (uploadError) {

      alert(uploadError.message);
      return;

    }



    const {
      data: { user },
    } = await supabase.auth.getUser();



    if (!user) {

      alert("Please login first");
      return;

    }



    const { data: urlData } = supabase.storage
      .from("resumes")
      .getPublicUrl(fileName);



    const { data: insertedResume, error: databaseError } =
      await supabase
.from("resumes")
.insert({
  user_id: user.id,
  file_name: fileName,
  file_url: urlData.publicUrl,
  resume_text: resumeText,
  ats_score: null,
  ai_feedback: null,
})
        .select()
        .single();



    if (databaseError) {

      alert(databaseError.message);
      return;

    }



   setLatestResume({
  ...insertedResume,
  resume_text: resumeText,
});

setResumeCount((prev) => prev + 1);

alert("Resume uploaded successfully!");

// Reset file input so the same file (or previously selected file) can be chosen again
if (fileInputRef.current) {
  fileInputRef.current.value = "";
}

}; 



  // AI SCAN BUTTON (EDGE FUNCTION NEXT)
  const handleScanResume = async () => {

  if (!latestResume) {
    alert("Please upload a resume first.");
    return;
  }

  setIsScanning(true);


  try {

    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({

        resume_text: latestResume?.resume_text || "",

        job_description:
        "Software developer role requiring skills and experience."

      }),

    });


    if (!response.ok) {
  throw new Error("Make webhook failed");
}

const result = await response.json();
    await supabase
.from("resumes")
.update({
  ats_score: result.ats_score,
  ai_feedback: result.feedback,
})
.eq("id", latestResume.id);

setLatestResume({
  ...latestResume,
  ats_score: result.ats_score,
  ai_feedback: result.feedback,
});
    


    console.log("AI Result:", result);


    alert(
      `ATS Score: ${result.ats_score}%\n\n${result.feedback}`
    );


  } catch(error){

    console.error(error);

    alert("AI scan failed");

  }


  setIsScanning(false);

};



  return (

    <main className="space-y-8">


      {/* HERO */}

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/10 p-8 shadow-2xl">


        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />


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


            <button className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-7 py-3 font-semibold text-white">

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

                {latestResume?.ats_score !== null &&
                latestResume?.ats_score !== undefined
                  ? "ATS scan completed"
                  : latestResume
                  ? "Waiting for scan"
                  : "No resume uploaded"}

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



      {/* STATS */}

      <section className="grid gap-6 md:grid-cols-3">


        {/* ATS SCORE */}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">

              <FileText className="h-6 w-6 text-indigo-400"/>

            </div>


            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">

              ATS SCORE

            </span>

          </div>


          <h2 className="mt-6 text-5xl font-black text-white">

            {latestResume?.ats_score ?? 0}%

          </h2>


          <p className="mt-2 text-slate-400">

            {latestResume?.ats_score !== null &&
            latestResume?.ats_score !== undefined

              ? "Resume analysed successfully."

              : "Upload a resume to receive your first ATS score."}

          </p>


        </div>



        {/* RESUMES */}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">

              <Sparkles className="h-6 w-6 text-purple-400"/>

            </div>


            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">

              RESUMES

            </span>

          </div>


          <h2 className="mt-6 text-5xl font-black text-white">

            {resumeCount}

          </h2>


          <p className="mt-2 text-slate-400">

            Resumes Uploaded

          </p>

        </div>




        {/* APPLICATIONS */}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">


          <div className="flex items-center justify-between">


            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">

              <TrendingUp className="h-6 w-6 text-emerald-400"/>

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


        </div>


      </section>



      {/* UPLOAD AREA */}


      <section className="rounded-3xl border border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-10">


        <div className="flex flex-col items-center text-center">


          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20">

            <UploadCloud className="h-10 w-10 text-indigo-300"/>

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

            className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 font-semibold text-white"

          >

            Upload Resume

          </button>



          <button

            onClick={handleScanResume}

            disabled={isScanning}

            className="mt-4 rounded-2xl bg-emerald-600 px-8 py-4 font-semibold text-white disabled:opacity-50"

          >

            {isScanning ? "Scanning..." : "Scan Resume with AI"}

          </button>



        </div>


      </section>
      

{/* RECENT ACTIVITY */}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <Activity className="h-6 w-6 text-indigo-400"/>

          <h2 className="text-xl font-bold text-white">
            Recent Activity
          </h2>

        </div>


        <div className="mt-6 space-y-4">


          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">

              <UploadCloud className="h-5 w-5 text-indigo-300"/>

            </div>


            <div>

              <p className="font-medium text-white">
                Resume uploaded
              </p>

              <p className="text-sm text-slate-400">
                {latestResume
                  ? latestResume.file_name
                  : "Waiting for upload"}
              </p>

            </div>


          </div>



          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">


            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">

              <CheckCircle2 className="h-5 w-5 text-emerald-400"/>

            </div>


            <div>

              <p className="font-medium text-white">
                ATS scan
              </p>


              <p className="text-sm text-slate-400">

                {latestResume?.ats_score
                  ? "Completed successfully"
                  : "Waiting for AI analysis"}

              </p>


            </div>


          </div>



          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">


            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">

              <Sparkles className="h-5 w-5 text-purple-400"/>

            </div>


            <div>

              <p className="font-medium text-white">
                Resume tailored
              </p>


              <p className="text-sm text-slate-400">
                AI improvements will appear here
              </p>


            </div>


          </div>


        </div>


      </section>




      {/* AI SUGGESTIONS */}


      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">


        <div className="flex items-center gap-3">


          <Zap className="h-6 w-6 text-yellow-400"/>


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

              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-5"

            >


              <CheckCircle2 className="h-5 w-5 text-green-400"/>


              <p className="text-slate-300">
                {item}
              </p>


            </div>


          ))}


        </div>


      </section>




      {/* PLANS */}



      <section className="grid gap-6 lg:grid-cols-2">



        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-8">


          <div className="flex items-center gap-3">


            <Sparkles className="h-6 w-6 text-indigo-300"/>


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
            ].map((item)=>(


              <div key={item} className="flex items-center gap-3 text-slate-200">


                <CheckCircle2 className="h-5 w-5 text-emerald-400"/>


                {item}


              </div>


            ))}


          </div>


        </div>





        <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent p-8">


          <div className="flex items-center gap-3">


            <Crown className="h-6 w-6 text-yellow-400"/>


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
            ].map((item)=>(


              <li key={item} className="flex items-center gap-3 text-slate-200">


                <CheckCircle2 className="h-5 w-5 text-yellow-400"/>


                {item}


              </li>


            ))}


          </ul>



          <button className="mt-8 rounded-2xl bg-yellow-400 px-8 py-3 font-bold text-black">

            Upgrade Now

          </button>


        </div>



      </section>
            <button
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 font-semibold text-white shadow-2xl"
      >

        <Bot className="h-5 w-5" />

        Ask Workivo AI

      </button>


    </main>
  );
}
