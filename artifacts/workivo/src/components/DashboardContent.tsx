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
  ScanSearch,
  WandSparkles,
  BriefcaseBusiness,
  ClipboardList,
  BarChart3,
  X,
  ChevronRight,
  LockKeyhole,
} from "lucide-react";

import { useRef, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { extractPdfText } from "../lib/pdfReader";

export default function DashboardContent() {
  /* =========================================================
     EXISTING WORKING RESUME / ATS STATE
     ========================================================= */

  const [latestResume, setLatestResume] = useState<any>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  /* =========================================================
     DASHBOARD UI LIMITS
     
     IMPORTANT:
     These are UI limits only for now.
     Real server/database enforcement will be added later.
     ========================================================= */

  const FREE_LIMITS = {
    atsScans: 3,
    tailoredResumes: 3,
    jobMatches: 2,
    trackedApplications: 10,
  };

  const [usage] = useState({
    atsScans: 0,
    tailoredResumes: 0,
    jobMatches: 0,
    trackedApplications: 0,
  });

  /* =========================================================
     DASHBOARD NAVIGATION
     
     This only controls the dashboard UI.
     It does NOT replace or interfere with the existing
     upload / ATS pipeline.
     ========================================================= */

  const [activeWorkspace, setActiveWorkspace] = useState<
    "overview" | "ats" | "tailored" | "matching" | "tracker" | "insights"
  >("overview");

  const [showWorkspace, setShowWorkspace] = useState(false);

  const openWorkspace = (
    workspace:
      | "overview"
      | "ats"
      | "tailored"
      | "matching"
      | "tracker"
      | "insights"
  ) => {
    setActiveWorkspace(workspace);
    setShowWorkspace(workspace !== "overview");
  };

  const closeWorkspace = () => {
    setShowWorkspace(false);
    setActiveWorkspace("overview");
  };

  /* =========================================================
     EXISTING MAKE WEBHOOK
     DO NOT CHANGE
     ========================================================= */

  const MAKE_WEBHOOK_URL =
    "https://hook.eu1.make.com/hy6c1fbiuwhk1iyjfm48defjdrb0577l";

  /* =========================================================
     EXISTING FILE INPUT
     DO NOT CHANGE
     ========================================================= */

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /* =========================================================
     LOAD USER RESUME AFTER REFRESH
     EXISTING LOGIC
     ========================================================= */

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

  /* =========================================================
     EXISTING RESUME UPLOAD PIPELINE
     
     IMPORTANT:
     This is deliberately kept working the same way.
     Do NOT connect the new workspace buttons directly
     to a different upload handler.
     ========================================================= */

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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =========================================================
     EXISTING ATS SCAN PIPELINE
     
     IMPORTANT:
     DO NOT MODIFY THIS CONNECTION.
     ========================================================= */

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
            "Software developer role requiring skills and experience.",
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
    } catch (error) {
      console.error(error);

      alert("AI scan failed");
    }

    setIsScanning(false);
  };

  /* =========================================================
     UI-ONLY FEATURE ACCESS
     
     These do NOT run the future AI pipelines yet.
     They simply give the dashboard the proper structure
     so we can connect the real backend later.
     ========================================================= */

  const canUseATS = usage.atsScans < FREE_LIMITS.atsScans;

  const canUseTailored =
    usage.tailoredResumes < FREE_LIMITS.tailoredResumes;

  const canUseMatching =
    usage.jobMatches < FREE_LIMITS.jobMatches;

  const canUseTracker =
    usage.trackedApplications < FREE_LIMITS.trackedApplications;

  const featureCards = [
    {
      id: "ats" as const,
      title: "ATS Resume Scanner",
      description:
        "Scan your resume against a target job and see how well it matches ATS requirements.",
      icon: ScanSearch,
      badge: `${FREE_LIMITS.atsScans} free scans`,
      available: canUseATS,
      action: "Scan Resume",
    },
    {
      id: "tailored" as const,
      title: "AI Tailored Resume",
      description:
        "Rewrite and optimize your resume for a specific job while keeping your experience authentic.",
      icon: WandSparkles,
      badge: `${FREE_LIMITS.tailoredResumes} free rewrites`,
      available: canUseTailored,
      action: "Tailor Resume",
    },
    {
      id: "matching" as const,
      title: "AI Job Matching",
      description:
        "Find opportunities that fit your resume, skills and career direction.",
      icon: BriefcaseBusiness,
      badge: `${FREE_LIMITS.jobMatches} free matches`,
      available: canUseMatching,
      action: "Find Jobs",
    },
    {
      id: "tracker" as const,
      title: "Job Tracker",
      description:
        "Keep your applications organized and monitor your job search from one place.",
      icon: ClipboardList,
      badge: `${FREE_LIMITS.trackedApplications} tracked`,
      available: canUseTracker,
      action: "Open Tracker",
    },
    {
      id: "insights" as const,
      title: "Career Insights",
      description:
        "See resume performance, application activity and career recommendations.",
      icon: BarChart3,
      badge: "Career intelligence",
      available: true,
      action: "View Insights",
    },
  ];

  /* =========================================================
     HELPER: WORKSPACE TITLE
     ========================================================= */

  const getWorkspaceTitle = () => {
    switch (activeWorkspace) {
      case "ats":
        return "ATS Resume Scanner";

      case "tailored":
        return "AI Tailored Resume";

      case "matching":
        return "AI Job Matching";

      case "tracker":
        return "Job Tracker";

      case "insights":
        return "Career Insights";

      default:
        return "Workivo";
    }
  };

  /* =========================================================
     HELPER: WORKSPACE DESCRIPTION
     ========================================================= */

  const getWorkspaceDescription = () => {
    switch (activeWorkspace) {
      case "ats":
        return "Analyze your resume against a target role.";

      case "tailored":
        return "Create a stronger, job-specific version of your resume.";

      case "matching":
        return "Discover jobs that match your experience and goals.";

      case "tracker":
        return "Organize and manage your job applications.";

      case "insights":
        return "Understand your resume and job-search performance.";

      default:
        return "";
    }
  };
    /* =========================================================
     MAIN DASHBOARD UI
     ========================================================= */

  return (
    <main className="relative min-h-screen overflow-hidden text-white">

      {/* =====================================================
          PREMIUM AI BACKGROUND
          Dark-only theme with blurred futuristic atmosphere
          ===================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-[#05060a]">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.16),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(14,165,233,0.10),transparent_40%)]" />

        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />

        <div className="absolute right-0 top-40 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[140px]" />

        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-cyan-500/5 blur-[130px]" />

      </div>


      {/* =====================================================
          TOP DASHBOARD HEADER
          ===================================================== */}

      <section className="relative mb-8 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">

        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200">

              <Sparkles className="h-3.5 w-3.5" />

              WORKIVO AI V2.0

            </div>


            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">

              Your career command center.

            </h1>


            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">

              Analyze your resume, tailor it for specific roles,
              discover matching jobs and manage your applications
              from one intelligent workspace.

            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
            >

              <UploadCloud className="h-4 w-4" />

              Upload Resume

            </button>


            <button
              onClick={() => openWorkspace("ats")}
              className="flex items-center gap-2 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
            >

              <ScanSearch className="h-4 w-4" />

              ATS Scanner

            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          RESUME STATUS STRIP
          ===================================================== */}

      <section className="mb-8 grid gap-4 md:grid-cols-3">

        {/* LAST RESUME */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">

                <FileText className="h-5 w-5 text-indigo-300" />

              </div>

              <div>

                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Resume
                </p>

                <p className="mt-1 max-w-[190px] truncate text-sm font-semibold text-white">

                  {latestResume
                    ? latestResume.file_name
                    : "No resume uploaded"}

                </p>

              </div>

            </div>

            <CheckCircle2
              className={`h-5 w-5 ${
                latestResume
                  ? "text-emerald-400"
                  : "text-slate-600"
              }`}
            />

          </div>

        </div>


        {/* ATS STATUS */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">

                <ScanSearch className="h-5 w-5 text-emerald-300" />

              </div>

              <div>

                <p className="text-xs uppercase tracking-widest text-slate-500">
                  ATS Score
                </p>

                <p className="mt-1 text-sm font-semibold text-white">

                  {latestResume?.ats_score !== null &&
                  latestResume?.ats_score !== undefined
                    ? `${latestResume.ats_score}%`
                    : "Not scanned"}

                </p>

              </div>

            </div>

            {latestResume?.ats_score !== null &&
            latestResume?.ats_score !== undefined ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                READY
              </span>
            ) : (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                PENDING
              </span>
            )}

          </div>

        </div>


        {/* RESUME COUNT */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">

                <Sparkles className="h-5 w-5 text-purple-300" />

              </div>

              <div>

                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Resume Library
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {resumeCount} uploaded
                </p>

              </div>

            </div>

            <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold text-purple-300">
              LIBRARY
            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN FEATURE GRID
          ===================================================== */}

      <section className="mb-8">

        <div className="mb-5 flex items-end justify-between gap-4">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
              Workivo Intelligence
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              Career tools
            </h2>

          </div>


          <div className="hidden text-right sm:block">

            <p className="text-xs text-slate-500">
              Free plan usage
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-300">
              {usage.atsScans}/{FREE_LIMITS.atsScans} ATS scans used
            </p>

          </div>

        </div>


        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          {featureCards
            .filter((feature) =>
              ["ats", "tailored", "matching", "tracker"].includes(
                feature.id
              )
            )
            .map((feature) => {

              const Icon = feature.icon;

              return (
                <button
                  key={feature.id}
                  onClick={() => openWorkspace(feature.id)}
                  className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-6 text-left shadow-xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.07]"
                >

                  {/* CARD GLOW */}

                  <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl transition group-hover:bg-indigo-500/20" />


                  <div className="relative z-10">

                    <div className="flex items-start justify-between">

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10">

                        <Icon className="h-6 w-6 text-indigo-300" />

                      </div>


                      <ArrowUpRight className="h-5 w-5 text-slate-600 transition group-hover:text-indigo-300" />

                    </div>


                    <h3 className="mt-6 text-lg font-bold text-white">

                      {feature.title}

                    </h3>


                    <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-400">

                      {feature.description}

                    </p>


                    <div className="mt-5 flex items-center justify-between">

                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-slate-300">

                        {feature.badge}

                      </span>


                      {feature.available ? (
                        <span className="text-xs font-bold text-indigo-300">

                          Open

                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">

                          <LockKeyhole className="h-3.5 w-3.5" />

                          Limit

                        </span>
                      )}

                    </div>

                  </div>

                </button>
              );
            })}

        </div>

      </section>


      {/* =====================================================
          ATS FEATURE PANEL
          Existing working scan button remains connected
          ===================================================== */}

      <section className="relative mb-8 overflow-hidden rounded-[32px] border border-indigo-400/15 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent p-7 shadow-2xl backdrop-blur-xl">

        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15">

                <ScanSearch className="h-6 w-6 text-indigo-300" />

              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                  Resume intelligence
                </p>

                <h2 className="text-2xl font-black text-white">
                  Scan your resume with AI
                </h2>

              </div>

            </div>


            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">

              Your existing ATS scanner remains connected to the
              working backend. Upload a resume first, then run the
              AI scan without changing the existing pipeline.

            </p>


            <div className="mt-6 flex flex-wrap gap-3">

              <button
                onClick={handleUploadClick}
                className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >

                <UploadCloud className="h-4 w-4" />

                Upload Resume

              </button>


              <button
                onClick={handleScanResume}
                disabled={isScanning}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <ScanSearch className="h-4 w-4" />

                {isScanning
                  ? "Scanning..."
                  : "Scan Resume with AI"}

              </button>

            </div>

          </div>


          <div className="rounded-3xl border border-white/10 bg-black/20 p-6">

            <p className="text-xs uppercase tracking-widest text-slate-500">
              Current ATS score
            </p>


            <div className="mt-3 flex items-end gap-2">

              <span className="text-6xl font-black text-white">

                {latestResume?.ats_score ?? 0}

              </span>

              <span className="mb-2 text-xl font-bold text-indigo-300">
                %
              </span>

            </div>


            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">

              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                style={{
                  width: `${Math.min(
                    Number(latestResume?.ats_score ?? 0),
                    100
                  )}%`,
                }}
              />

            </div>


            <p className="mt-3 text-xs text-slate-500">

              {latestResume?.ats_score !== null &&
              latestResume?.ats_score !== undefined
                ? "Latest resume analysis"
                : "Upload and scan your resume to calculate your score"}

            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          CAREER WORKSPACE PREVIEW
          ===================================================== */}

      <section className="mb-8 grid gap-5 lg:grid-cols-3">

        <button
          onClick={() => openWorkspace("tailored")}
          className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-left backdrop-blur-xl transition hover:border-purple-400/25 hover:bg-white/[0.06]"
        >

          <div className="flex items-center justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10">

              <WandSparkles className="h-5 w-5 text-purple-300" />

            </div>

            <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-purple-300" />

          </div>


          <h3 className="mt-5 text-lg font-bold text-white">
            AI Tailored Resume
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Turn your existing resume into a targeted version for
            the exact position you want.
          </p>

        </button>


        <button
          onClick={() => openWorkspace("matching")}
          className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-left backdrop-blur-xl transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
        >

          <div className="flex items-center justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10">

              <BriefcaseBusiness className="h-5 w-5 text-cyan-300" />

            </div>

            <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-cyan-300" />

          </div>


          <h3 className="mt-5 text-lg font-bold text-white">
            AI Job Matching
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Discover opportunities that line up with your skills,
            experience and career goals.
          </p>

        </button>


        <button
          onClick={() => openWorkspace("tracker")}
          className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-left backdrop-blur-xl transition hover:border-emerald-400/25 hover:bg-white/[0.06]"
        >

          <div className="flex items-center justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">

              <ClipboardList className="h-5 w-5 text-emerald-300" />

            </div>

            <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-300" />

          </div>


          <h3 className="mt-5 text-lg font-bold text-white">
            Job Tracker
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Keep every application organized from application
            through interview and offer.
          </p>

        </button>

      </section>
            {/* =====================================================
          WORKSPACE MODAL / AI TOOL CENTER
          ===================================================== */}

      {showWorkspace && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close workspace"
            onClick={closeWorkspace}
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md"
          />


          {/* MODAL */}

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#080a11]/95 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl">

            {/* =================================================
                LEFT WORKSPACE NAVIGATION
                ================================================= */}

            <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/20 p-5 md:block">

              <div className="mb-7 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">

                  <Sparkles className="h-5 w-5 text-indigo-300" />

                </div>

                <div>

                  <p className="text-sm font-bold text-white">
                    Workivo AI
                  </p>

                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    Workspace
                  </p>

                </div>

              </div>


              <nav className="space-y-2">

                <button
                  onClick={() => openWorkspace("overview")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activeWorkspace === "overview"
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  <Activity className="h-4 w-4" />

                  Overview

                </button>


                <button
                  onClick={() => openWorkspace("ats")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activeWorkspace === "ats"
                      ? "bg-indigo-500/15 text-indigo-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  <ScanSearch className="h-4 w-4" />

                  ATS Scanner

                </button>


                <button
                  onClick={() => openWorkspace("tailored")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activeWorkspace === "tailored"
                      ? "bg-purple-500/15 text-purple-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  <WandSparkles className="h-4 w-4" />

                  Tailored Resume

                </button>


                <button
                  onClick={() => openWorkspace("matching")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activeWorkspace === "matching"
                      ? "bg-cyan-500/15 text-cyan-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  <BriefcaseBusiness className="h-4 w-4" />

                  Job Matching

                </button>


                <button
                  onClick={() => openWorkspace("tracker")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activeWorkspace === "tracker"
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  <ClipboardList className="h-4 w-4" />

                  Job Tracker

                </button>


                <button
                  onClick={() => openWorkspace("insights")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activeWorkspace === "insights"
                      ? "bg-yellow-500/10 text-yellow-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >

                  <BarChart3 className="h-4 w-4" />

                  Career Insights

                </button>

              </nav>


              {/* PLAN CARD */}

              <div className="mt-8 rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-4">

                <div className="flex items-center gap-2">

                  <Crown className="h-4 w-4 text-yellow-400" />

                  <p className="text-xs font-bold text-white">
                    Free Plan
                  </p>

                </div>


                <p className="mt-2 text-[11px] leading-5 text-slate-500">

                  Upgrade when you need more AI career tools and higher usage limits.

                </p>


                <button
                  type="button"
                  className="mt-4 w-full rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black transition hover:bg-yellow-300"
                >

                  Upgrade to Pro

                </button>

              </div>

            </aside>


            {/* =================================================
                WORKSPACE CONTENT
                ================================================= */}

            <div className="flex min-w-0 flex-1 flex-col">

              {/* MODAL HEADER */}

              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
                    Workivo Intelligence
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white md:text-2xl">
                    {getWorkspaceTitle()}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 md:text-sm">
                    {getWorkspaceDescription()}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={closeWorkspace}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >

                  <X className="h-5 w-5" />

                </button>

              </div>


              {/* MOBILE NAVIGATION */}

              <div className="flex gap-2 overflow-x-auto border-b border-white/10 p-3 md:hidden">

                {[
                  {
                    id: "ats" as const,
                    label: "ATS",
                    icon: ScanSearch,
                  },
                  {
                    id: "tailored" as const,
                    label: "Tailor",
                    icon: WandSparkles,
                  },
                  {
                    id: "matching" as const,
                    label: "Jobs",
                    icon: BriefcaseBusiness,
                  },
                  {
                    id: "tracker" as const,
                    label: "Tracker",
                    icon: ClipboardList,
                  },
                  {
                    id: "insights" as const,
                    label: "Insights",
                    icon: BarChart3,
                  },
                ].map((item) => {

                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => openWorkspace(item.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                        activeWorkspace === item.id
                          ? "bg-indigo-500/15 text-indigo-200"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >

                      <Icon className="h-3.5 w-3.5" />

                      {item.label}

                    </button>
                  );
                })}

              </div>


              {/* CONTENT AREA */}

              <div className="flex-1 overflow-y-auto p-5 md:p-7">


                {/* =================================================
                    ATS WORKSPACE
                    EXISTING WORKING PIPELINE CONNECTED
                    ================================================= */}

                {activeWorkspace === "ats" && (
                  <div className="space-y-6">

                    <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">

                      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">

                        <div className="flex items-center gap-3">

                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15">

                            <ScanSearch className="h-6 w-6 text-indigo-300" />

                          </div>

                          <div>

                            <h3 className="font-bold text-white">
                              Resume ATS Analysis
                            </h3>

                            <p className="text-xs text-slate-500">
                              Powered by your existing AI scan pipeline
                            </p>

                          </div>

                        </div>


                        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">

                          <p className="text-xs uppercase tracking-widest text-slate-500">
                            Selected resume
                          </p>

                          <p className="mt-2 truncate font-semibold text-white">

                            {latestResume
                              ? latestResume.file_name
                              : "No resume uploaded"}

                          </p>

                        </div>


                        <div className="mt-5 flex flex-wrap gap-3">

                          <button
                            onClick={handleUploadClick}
                            className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                          >

                            <UploadCloud className="h-4 w-4" />

                            Upload Resume

                          </button>


                          <button
                            onClick={handleScanResume}
                            disabled={isScanning}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                          >

                            <ScanSearch className="h-4 w-4" />

                            {isScanning
                              ? "Scanning..."
                              : "Scan with AI"}

                          </button>

                        </div>

                      </div>


                      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-6">

                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          ATS score
                        </p>


                        <div className="mt-3">

                          <span className="text-6xl font-black text-white">

                            {latestResume?.ats_score ?? 0}

                          </span>

                          <span className="ml-1 text-xl font-bold text-indigo-300">
                            %
                          </span>

                        </div>


                        <p className="mt-3 text-sm leading-6 text-slate-400">

                          {latestResume?.ats_score !== null &&
                          latestResume?.ats_score !== undefined
                            ? "Your latest resume has been analyzed."
                            : "Upload and scan a resume to generate your ATS score."}

                        </p>

                      </div>

                    </div>


                    {/* FEEDBACK AREA */}

                    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">

                      <div className="flex items-center gap-3">

                        <Zap className="h-5 w-5 text-yellow-400" />

                        <h3 className="font-bold text-white">
                          AI Feedback
                        </h3>

                      </div>


                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">

                        {latestResume?.ai_feedback ? (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                            {latestResume.ai_feedback}
                          </p>
                        ) : (
                          <p className="text-sm leading-6 text-slate-500">
                            Your AI feedback will appear here after the
                            resume scan returns a result.
                          </p>
                        )}

                      </div>

                    </div>

                  </div>
                )}


                {/* =================================================
                    AI TAILORED RESUME WORKSPACE
                    ================================================= */}

                {activeWorkspace === "tailored" && (
                  <div className="space-y-6">

                    <div className="rounded-3xl border border-purple-400/15 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-7">

                      <div className="flex items-center gap-4">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15">

                          <WandSparkles className="h-7 w-7 text-purple-300" />

                        </div>

                        <div>

                          <h3 className="text-xl font-black text-white">
                            AI Tailored Resume
                          </h3>

                          <p className="mt-1 text-sm text-slate-400">
                            Build a job-specific version of your resume.
                          </p>

                        </div>

                      </div>


                      <div className="mt-7 grid gap-4 md:grid-cols-2">

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

                          <p className="text-xs uppercase tracking-widest text-slate-500">
                            Resume
                          </p>

                          <p className="mt-2 truncate text-sm font-semibold text-white">

                            {latestResume
                              ? latestResume.file_name
                              : "Upload a resume first"}

                          </p>

                        </div>


                        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

                          <p className="text-xs uppercase tracking-widest text-slate-500">
                            Free usage
                          </p>

                          <p className="mt-2 text-sm font-semibold text-purple-300">

                            {usage.tailoredResumes}/
                            {FREE_LIMITS.tailoredResumes} rewrites

                          </p>

                        </div>

                      </div>


                      <div className="mt-6 rounded-2xl border border-dashed border-purple-400/20 bg-black/20 p-6">

                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Target job description
                        </label>

                        <textarea
                          placeholder="Paste the job description here..."
                          className="mt-3 min-h-[150px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-400/30"
                        />

                      </div>


                      <button
                        type="button"
                        className="mt-5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                      >

                        <Sparkles className="h-4 w-4" />

                        Tailor My Resume

                      </button>

                    </div>

                  </div>
                )}
                      {/* RECENT ACTIVITY */}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <Activity className="h-6 w-6 text-indigo-400" />

          <div>
            <h2 className="text-xl font-bold text-white">
              Recent Activity
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Your latest Workivo activity
            </p>
          </div>

        </div>


        <div className="mt-6 space-y-4">

          {/* RESUME UPLOAD */}

          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">

              <UploadCloud className="h-5 w-5 text-indigo-300" />

            </div>


            <div className="min-w-0 flex-1">

              <p className="font-medium text-white">
                Resume uploaded
              </p>

              <p className="truncate text-sm text-slate-400">

                {latestResume
                  ? latestResume.file_name
                  : "Waiting for your first resume"}

              </p>

            </div>


            {latestResume && (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}

          </div>



          {/* ATS SCAN */}

          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">

              <TrendingUp className="h-5 w-5 text-emerald-400" />

            </div>


            <div className="min-w-0 flex-1">

              <p className="font-medium text-white">
                ATS scan
              </p>

              <p className="text-sm text-slate-400">

                {latestResume?.ats_score !== null &&
                latestResume?.ats_score !== undefined

                  ? `Completed — ${latestResume.ats_score}% ATS score`

                  : "Upload a resume and run your ATS scan"}

              </p>

            </div>


            {latestResume?.ats_score !== null &&
            latestResume?.ats_score !== undefined && (

              <CheckCircle2 className="h-5 w-5 text-emerald-400" />

            )}

          </div>



          {/* AI TAILORED RESUME */}

          <button
            onClick={() => {
              if (!latestResume) {
                alert("Please upload a resume first.");
                return;
              }

              alert("AI Tailored Resume is ready to connect.");
            }}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-purple-400/30 hover:bg-purple-500/10"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">

              <Sparkles className="h-5 w-5 text-purple-400" />

            </div>


            <div className="min-w-0 flex-1">

              <p className="font-medium text-white">
                AI Tailored Resume
              </p>

              <p className="text-sm text-slate-400">
                Rewrite and optimise your resume for a specific job
              </p>

            </div>


            <ArrowUpRight className="h-5 w-5 text-slate-500 transition group-hover:text-purple-300" />

          </button>



          {/* JOB MATCHING */}

          <button
            onClick={() => {
              if (!latestResume) {
                alert("Please upload a resume first.");
                return;
              }

              alert("Job Matching is ready to connect.");
            }}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/10"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">

              <ArrowUpRight className="h-5 w-5 text-cyan-400" />

            </div>


            <div className="min-w-0 flex-1">

              <p className="font-medium text-white">
                Smart Job Matching
              </p>

              <p className="text-sm text-slate-400">
                Discover opportunities that fit your resume
              </p>

            </div>


            <ArrowUpRight className="h-5 w-5 text-slate-500 transition group-hover:text-cyan-300" />

          </button>



          {/* JOB TRACKER */}

          <button
            onClick={() => {
              alert("Job Tracker is ready to connect.");
            }}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/10"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">

              <Activity className="h-5 w-5 text-emerald-400" />

            </div>


            <div className="min-w-0 flex-1">

              <p className="font-medium text-white">
                Job Tracker
              </p>

              <p className="text-sm text-slate-400">
                Track applications, interviews and opportunities
              </p>

            </div>


            <ArrowUpRight className="h-5 w-5 text-slate-500 transition group-hover:text-emerald-300" />

          </button>

        </div>

      </section>



      {/* AI CAREER SUGGESTIONS */}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-500/10">

            <Zap className="h-6 w-6 text-yellow-400" />

          </div>


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
            {
              title: "Strengthen your achievements",
              description:
                "Add measurable results and outcomes to your experience.",
            },

            {
              title: "Improve your professional summary",
              description:
                "Make your opening section clearer and more targeted.",
            },

            {
              title: "Increase ATS keyword matching",
              description:
                "Use relevant keywords from the job description naturally.",
            },

            {
              title: "Tailor your resume",
              description:
                "Create a job-specific version using Workivo AI.",
            },
          ].map((item) => (

            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20"
            >

              <div className="flex items-start gap-3">

                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <div>

                  <p className="font-medium text-white">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>

                </div>

              </div>

            </div>

          ))}

        </div>

      </section>



      {/* PLANS */}

      <section className="grid gap-6 lg:grid-cols-2">

        {/* FREE */}

        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent p-8">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20">

                <Sparkles className="h-6 w-6 text-indigo-300" />

              </div>

              <h2 className="text-xl font-bold text-white">
                Free Plan
              </h2>

            </div>


            <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              FREE
            </span>

          </div>


          <p className="mt-5 text-slate-300">
            Start building a stronger job search with essential Workivo AI tools.
          </p>



          <div className="mt-7 space-y-4">

            {[
              "3 ATS resume scans",
              "3 AI tailored resume rewrites",
              "2 smart job matches",
              "5 tracked job applications",
            ].map((item) => (

              <div
                key={item}
                className="flex items-center gap-3 text-slate-200"
              >

                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />

                <span>{item}</span>

              </div>

            ))}

          </div>


          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">

            <p className="text-xs uppercase tracking-widest text-slate-500">
              Current usage
            </p>

            <div className="mt-3 space-y-2 text-sm">

              <div className="flex justify-between text-slate-300">
                <span>Resumes</span>
                <span className="font-semibold text-white">
                  {resumeCount} / 3
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>ATS scans</span>
                <span className="font-semibold text-white">
                  {latestResume?.ats_score !== null &&
                  latestResume?.ats_score !== undefined
                    ? "1 / 3"
                    : "0 / 3"}
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Tailored resumes</span>
                <span className="font-semibold text-white">
                  0 / 3
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Job matches</span>
                <span className="font-semibold text-white">
                  0 / 2
                </span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Tracked applications</span>
                <span className="font-semibold text-white">
                  0 / 5
                </span>
              </div>

            </div>

          </div>

        </div>



        {/* PRO */}

        <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent p-8">

          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />


          <div className="relative">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400/10">

                  <Crown className="h-6 w-6 text-yellow-400" />

                </div>

                <h2 className="text-xl font-bold text-white">
                  Pro Plan
                </h2>

              </div>


              <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                $10 / MONTH
              </span>

            </div>


            <p className="mt-5 text-slate-300">
              Unlock unlimited AI career tools and remove the limits.
            </p>


            <ul className="mt-7 space-y-4">

              {[
                "Unlimited ATS scans",
                "Unlimited AI tailored resumes",
                "Unlimited smart job matching",
                "Unlimited job tracking",
                "Priority AI assistance",
              ].map((item) => (

                <li
                  key={item}
                  className="flex items-center gap-3 text-slate-200"
                >

                  <CheckCircle2 className="h-5 w-5 shrink-0 text-yellow-400" />

                  {item}

                </li>

              ))}

            </ul>


            <button
              className="mt-8 rounded-2xl bg-yellow-400 px-8 py-3 font-bold text-black transition hover:scale-105"
            >
              Upgrade to Pro
            </button>

          </div>

        </div>

      </section>



      {/* FLOATING WORKIVO AI */}

      <button
        onClick={() => alert("Workivo AI assistant is ready to connect.")}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-full border border-white/10 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 font-semibold text-white shadow-2xl shadow-indigo-900/40 backdrop-blur-xl transition hover:scale-105"
      >

        <Bot className="h-5 w-5" />

        <span>
          Ask Workivo AI
        </span>

      </button>


    </main>

  );
}
