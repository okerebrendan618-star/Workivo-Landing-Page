import {
  FileText,
  Sparkles,
  TrendingUp,
  UploadCloud,
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
     RESUME / ATS STATE
     ========================================================= */

  const [latestResume, setLatestResume] = useState<any>(null);
  const [resumeCount, setResumeCount] = useState(0);

  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  /* =========================================================
     FREE PLAN LIMITS
     ========================================================= */

  const FREE_LIMITS = {
    atsScans: 3,
    tailoredResumes: 3,
    jobMatches: 2,
    trackedApplications: 5,
  };

  /* =========================================================
     USAGE STATE
     
     IMPORTANT:
     These counters remain UI-side for now.
     They are NOT treated as secure billing enforcement.
     ========================================================= */

  const [usage, setUsage] = useState({
    atsScans: 0,
    tailoredResumes: 0,
    jobMatches: 0,
    trackedApplications: 0,
  });

  /* =========================================================
     STATIC ATS JOB DESCRIPTION
     
     IMPORTANT:
     The actual ATS webhook call is now server-side.
     The frontend never contains the Make webhook URL.
     
     The Edge Function can use this same fixed description
     server-side as well.
     ========================================================= */

  const STATIC_ATS_JOB_DESCRIPTION =
    "Software developer role requiring skills and experience.";

  /* =========================================================
     WORKSPACE NAVIGATION
     
     ONE workspace renderer only.
     The duplicate workspace/modal that existed later in the
     original file will be removed in Part 2.
     ========================================================= */

  type Workspace =
    | "overview"
    | "ats"
    | "tailored"
    | "matching"
    | "tracker"
    | "insights";

  const [activeWorkspace, setActiveWorkspace] =
    useState<Workspace>("overview");

  const [showWorkspace, setShowWorkspace] = useState(false);

  const openWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setShowWorkspace(workspace !== "overview");
  };

  const closeWorkspace = () => {
    setShowWorkspace(false);
    setActiveWorkspace("overview");
  };

  /* =========================================================
     FILE INPUT
     ========================================================= */

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    if (isUploading) return;

    fileInputRef.current?.click();
  };

  /* =========================================================
     RESET FILE INPUT
     ========================================================= */

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =========================================================
     LOAD USER RESUME AFTER REFRESH
     ========================================================= */

  useEffect(() => {
    let isMounted = true;

    const getLatestResume = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "AUTH ERROR:",
            authError
          );
          return;
        }

        if (!user) return;

        const {
          data,
          error,
        } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (!error && data && isMounted) {
          setLatestResume(data);
        }

        if (error) {
          console.error(
            "LATEST RESUME ERROR:",
            error
          );
        }

        const {
          count,
          error: countError,
        } = await supabase
          .from("resumes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id);

        if (countError) {
          console.error(
            "RESUME COUNT ERROR:",
            countError
          );
          return;
        }

        if (isMounted) {
          setResumeCount(count || 0);
        }
      } catch (error) {
        console.error(
          "RESUME LOAD ERROR:",
          error
        );
      }
    };

    getLatestResume();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =========================================================
     RESUME UPLOAD PIPELINE
     
     PDF ONLY.
     
     IMPORTANT:
     There is intentionally NO file-size validation here.
     Do not add one.
     ========================================================= */

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      resetFileInput();
      return;
    }

    /* -------------------------------------------------------
       PDF VALIDATION
       
       Keep PDF-only behavior.
       No size validation is intentionally performed.
       ------------------------------------------------------- */

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      alert("Please upload a PDF resume.");
      resetFileInput();
      return;
    }

    setIsUploading(true);

    let resumeText = "";
    let uploadedFileName: string | null = null;

    try {
      /* -----------------------------------------------------
         EXTRACT PDF TEXT
         ----------------------------------------------------- */

      resumeText = await extractPdfText(file);

      if (!resumeText.trim()) {
        alert(
          "PDF was opened, but no selectable text was found. Please upload a text-based PDF."
        );

        resetFileInput();
        return;
      }

      /* -----------------------------------------------------
         GET AUTHENTICATED USER BEFORE STORAGE WORK
         ----------------------------------------------------- */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(
          "AUTH ERROR:",
          authError
        );

        alert("Unable to verify your account.");
        resetFileInput();
        return;
      }

      if (!user) {
        alert("Please login first.");
        resetFileInput();
        return;
      }

      /* -----------------------------------------------------
         USER-SCOPED STORAGE PATH
         
         This avoids using a globally exposed/random root-level
         filename.
         ----------------------------------------------------- */

      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.pdf$/i, ".pdf");

      const fileName =
        `${user.id}/${Date.now()}-${safeFileName}`;

      uploadedFileName = fileName;

      /* -----------------------------------------------------
         UPLOAD TO SUPABASE STORAGE
         ----------------------------------------------------- */

      const {
        error: uploadError,
      } = await supabase.storage
        .from("resumes")
        .upload(fileName, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "STORAGE UPLOAD ERROR:",
          uploadError
        );

        alert(
          `Resume upload failed: ${uploadError.message}`
        );

        resetFileInput();
        return;
      }

      /* -----------------------------------------------------
         DATABASE INSERT
         ----------------------------------------------------- */

      /*
       * Keep the existing file_url column for compatibility.
       *
       * The storage path is stored rather than generating a
       * permanently public resume URL.
       */

      const {
        data: insertedResume,
        error: databaseError,
      } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_url: fileName,
          resume_text: resumeText,
          ats_score: null,
          ai_feedback: null,
        })
        .select()
        .single();

      if (databaseError) {
        console.error(
          "DATABASE INSERT ERROR:",
          databaseError
        );

        /* ---------------------------------------------------
           CLEAN UP STORAGE IF DATABASE INSERT FAILS
           --------------------------------------------------- */

        await supabase.storage
          .from("resumes")
          .remove([fileName]);

        uploadedFileName = null;

        alert(
          `Resume could not be saved: ${databaseError.message}`
        );

        resetFileInput();
        return;
      }

      /* -----------------------------------------------------
         UPDATE UI
         ----------------------------------------------------- */

      setLatestResume({
        ...insertedResume,
        resume_text: resumeText,
      });

      setResumeCount(
        (previousCount) => previousCount + 1
      );

      alert("Resume uploaded successfully!");

      resetFileInput();
    } catch (error) {
      console.error(
        "RESUME UPLOAD PIPELINE ERROR:",
        error
      );

      /* -----------------------------------------------------
         CLEAN UP ORPHANED STORAGE FILE
         ----------------------------------------------------- */

      if (uploadedFileName) {
        try {
          await supabase.storage
            .from("resumes")
            .remove([uploadedFileName]);
        } catch (cleanupError) {
          console.error(
            "STORAGE CLEANUP ERROR:",
            cleanupError
          );
        }
      }

      alert(
        `Resume upload failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );

      resetFileInput();
    } finally {
      setIsUploading(false);
    }
  };

  /* =========================================================
     ATS SCAN PIPELINE
     
     IMPORTANT SECURITY CHANGE:
     
     ❌ NO MAKE WEBHOOK URL IN FRONTEND
     
     The frontend now calls a Supabase Edge Function.
     
     The Edge Function is responsible for:
       1. Verifying the user
       2. Using the fixed ATS job description
       3. Calling Make securely
       4. Validating the Make response
       5. Returning the ATS result
     
     The Make webhook URL therefore never reaches the browser.
     ========================================================= */

  const handleScanResume = async () => {
    if (!latestResume) {
      alert("Please upload a resume first.");
      return;
    }

    if (!canUseATS) {
      alert(
        "You have reached your free ATS scan limit."
      );
      return;
    }

    if (isScanning) return;

    setIsScanning(true);

    try {
      /* -----------------------------------------------------
         SECURE SERVER-SIDE ATS REQUEST
         
         Edge Function name:
         ats-scan
         
         IMPORTANT:
         Do NOT put the Make URL here.
         ----------------------------------------------------- */

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "ats-scan",
        {
          body: {
            resume_text:
              latestResume.resume_text || "",

            /*
             * Kept here as a fixed value for compatibility.
             * The server should ultimately own the canonical
             * value as well.
             */
            job_description:
              STATIC_ATS_JOB_DESCRIPTION,
          },
        }
      );

      if (error) {
        console.error(
          "ATS FUNCTION ERROR:",
          error
        );

        throw new Error(
          error.message ||
            "ATS scan request failed."
        );
      }

      /* -----------------------------------------------------
         RESPONSE VALIDATION
         ----------------------------------------------------- */

      if (!data || typeof data !== "object") {
        throw new Error(
          "Invalid ATS response."
        );
      }

      const rawScore =
        Number(data.ats_score);

      if (
        !Number.isFinite(rawScore)
      ) {
        throw new Error(
          "ATS response did not contain a valid score."
        );
      }

      const atsScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(rawScore)
        )
      );

      const feedback =
        typeof data.feedback === "string"
          ? data.feedback
          : "";

      /* -----------------------------------------------------
         DATABASE UPDATE
         ----------------------------------------------------- */

      const {
        data: updatedResume,
        error: updateError,
      } = await supabase
        .from("resumes")
        .update({
          ats_score: atsScore,
          ai_feedback: feedback,
        })
        .eq("id", latestResume.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "ATS DATABASE UPDATE ERROR:",
          updateError
        );

        throw new Error(
          "The ATS scan completed, but the result could not be saved."
        );
      }

      /* -----------------------------------------------------
         UPDATE LOCAL RESUME STATE
         ----------------------------------------------------- */

      setLatestResume({
        ...latestResume,
        ...updatedResume,
        ats_score: atsScore,
        ai_feedback: feedback,
      });

      /* -----------------------------------------------------
         UPDATE UI USAGE
         ----------------------------------------------------- */

      setUsage((previousUsage) => ({
        ...previousUsage,
        atsScans:
          previousUsage.atsScans + 1,
      }));

      alert(
        `ATS Score: ${atsScore}%\n\n${
          feedback || "No additional feedback provided."
        }`
      );
    } catch (error) {
      console.error(
        "ATS SCAN ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "AI scan failed."
      );
    } finally {
      setIsScanning(false);
    }
  };
    /* =========================================================
     USAGE HELPERS
     ========================================================= */

  const canUseATS =
    usage.atsScans < FREE_LIMITS.atsScans;

  const canUseTailoredResume =
    usage.tailoredResumes <
    FREE_LIMITS.tailoredResumes;

  const canUseJobMatches =
    usage.jobMatches <
    FREE_LIMITS.jobMatches;

  const canUseTracker =
    usage.trackedApplications <
    FREE_LIMITS.trackedApplications;

  /* =========================================================
     ATS SCORE DISPLAY
     ========================================================= */

  const atsScore =
    latestResume?.ats_score !== null &&
    latestResume?.ats_score !== undefined
      ? Number(latestResume.ats_score)
      : null;

  const atsFeedback =
    typeof latestResume?.ai_feedback === "string"
      ? latestResume.ai_feedback
      : "";

  /* =========================================================
     WORKSPACE ACTIONS
     ========================================================= */

  const handleATSWorkspace = () => {
    if (!latestResume) {
      alert("Please upload a resume first.");
      return;
    }

    openWorkspace("ats");
  };

  const handleTailoredWorkspace = () => {
    if (!canUseTailoredResume) {
      alert(
        "You have reached your free tailored resume limit."
      );
      return;
    }

    if (!latestResume) {
      alert("Please upload a resume first.");
      return;
    }

    openWorkspace("tailored");
  };

  const handleMatchingWorkspace = () => {
    if (!canUseJobMatches) {
      alert(
        "You have reached your free job matching limit."
      );
      return;
    }

    openWorkspace("matching");
  };

  const handleTrackerWorkspace = () => {
    if (!canUseTracker) {
      alert(
        "You have reached your free application tracker limit."
      );
      return;
    }

    openWorkspace("tracker");
  };

  /* =========================================================
     OVERVIEW CARD
     ========================================================= */

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* ---------------------------------------------------
           HEADER
           --------------------------------------------------- */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Resume Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upload your resume, improve your ATS score,
              and manage your job applications.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <UploadCloud className="h-4 w-4" />

            {isUploading
              ? "Uploading..."
              : "Upload Resume"}
          </button>
        </div>

        {/* ---------------------------------------------------
           HIDDEN FILE INPUT
           --------------------------------------------------- */}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* ---------------------------------------------------
           RESUME STATUS
           --------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Latest Resume
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {latestResume
                    ? latestResume.file_name?.split("/").pop() ||
                      "Resume uploaded"
                    : "No resume uploaded yet"}
                </p>
              </div>
            </div>

            {latestResume && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Resume ready
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------
           FEATURE CARDS
           --------------------------------------------------- */}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* ATS */}
          <button
            type="button"
            onClick={handleATSWorkspace}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <ScanSearch className="h-5 w-5" />
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-500" />
            </div>

            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
              ATS Scanner
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Check how well your resume matches ATS
              requirements.
            </p>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {usage.atsScans}/{FREE_LIMITS.atsScans} used
              </span>

              {atsScore !== null && (
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {atsScore}% score
                </span>
              )}
            </div>
          </button>

          {/* TAILORED RESUME */}
          <button
            type="button"
            onClick={handleTailoredWorkspace}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-500/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <WandSparkles className="h-5 w-5" />
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-purple-500" />
            </div>

            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
              AI Resume Writer
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Tailor your resume to a specific job
              description.
            </p>

            <div className="mt-4 text-xs text-slate-400">
              {usage.tailoredResumes}/
              {FREE_LIMITS.tailoredResumes} used
            </div>
          </button>

          {/* JOB MATCHING */}
          <button
            type="button"
            onClick={handleMatchingWorkspace}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-500" />
            </div>

            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
              Job Matching
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Find opportunities that fit your resume
              and skills.
            </p>

            <div className="mt-4 text-xs text-slate-400">
              {usage.jobMatches}/{FREE_LIMITS.jobMatches} used
            </div>
          </button>

          {/* TRACKER */}
          <button
            type="button"
            onClick={handleTrackerWorkspace}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                <ClipboardList className="h-5 w-5" />
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-orange-500" />
            </div>

            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">
              Job Tracker
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Keep every application organized in one
              place.
            </p>

            <div className="mt-4 text-xs text-slate-400">
              {usage.trackedApplications}/
              {FREE_LIMITS.trackedApplications} tracked
            </div>
          </button>
        </div>

        {/* ---------------------------------------------------
           ATS QUICK ACTION
           --------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />

                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Ready to scan your resume?
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Upload a PDF resume and run an ATS scan
                to receive a score and AI feedback.
              </p>
            </div>

            <button
              type="button"
              onClick={handleScanResume}
              disabled={
                !latestResume ||
                isScanning ||
                !canUseATS
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Activity className="h-4 w-4 animate-pulse" />
                  Scanning...
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" />
                  Scan Resume
                </>
              )}
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------
           ATS RESULT
           --------------------------------------------------- */}

        {atsScore !== null && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-blue-100 dark:border-blue-500/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {atsScore}
                  </div>

                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    ATS
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Latest ATS Result
                  </h2>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {atsScore}/100
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {atsFeedback ||
                    "Your resume was scanned successfully."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------
           RESUME STATS
           --------------------------------------------------- */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Resumes
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {resumeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <ScanSearch className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ATS Scans
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {usage.atsScans}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Best ATS Score
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {atsScore !== null
                ? `${atsScore}%`
                : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Free ATS Left
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {Math.max(
                0,
                FREE_LIMITS.atsScans -
                  usage.atsScans
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     ATS WORKSPACE
     ========================================================= */

  const renderATSWorkspace = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              AI Resume Co-pilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              ATS Scanner
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Analyze your resume against ATS requirements.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWorkspace}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <ScanSearch className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Resume ATS Analysis
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Fixed job profile analysis
                </p>
              </div>
            </div>

            <div className="mt-8">
              {atsScore !== null ? (
                <div>
                  <div className="text-6xl font-bold text-slate-900 dark:text-white">
                    {atsScore}
                    <span className="text-2xl text-slate-400">
                      /100
                    </span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${atsScore}%`,
                      }}
                    />
                  </div>

                  <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {atsFeedback ||
                        "No additional feedback provided."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <ScanSearch className="mx-auto h-8 w-8 text-slate-400" />

                  <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                    No ATS result yet
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Run your first scan to see your score.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleScanResume}
              disabled={
                !latestResume ||
                isScanning ||
                !canUseATS
              }
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Activity className="h-4 w-4 animate-pulse" />
                  Scanning Resume...
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" />
                  Run ATS Scan
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-purple-500" />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  AI Analysis
                </h3>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Your resume is sent through the secure
                server-side ATS pipeline. The Make webhook
                URL is not exposed in the browser.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-5 w-5 text-emerald-500" />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Secure Pipeline
                </h3>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Browser → Supabase Edge Function → Make →
                ATS result.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-amber-500" />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Free Usage
                </h3>
              </div>

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {usage.atsScans} of{" "}
                {FREE_LIMITS.atsScans} ATS scans used.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     TAILORED RESUME WORKSPACE
     ========================================================= */

  const renderTailoredWorkspace = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
              AI Resume Co-pilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              AI Resume Writer
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tailor your resume for a specific opportunity.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWorkspace}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <WandSparkles className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              Tailor your resume with AI
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This workspace is ready for the AI resume
              rewriting pipeline.
            </p>

            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-left dark:bg-slate-800/60">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Current resume
              </p>

              <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                {latestResume?.file_name?.split("/").pop() ||
                  "No resume selected"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                alert(
                  "AI Resume Writer pipeline coming next."
                )
              }
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              Start AI Rewrite
            </button>

            <p className="mt-3 text-xs text-slate-400">
              {usage.tailoredResumes}/
              {FREE_LIMITS.tailoredResumes} free rewrites used
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     JOB MATCHING WORKSPACE
     ========================================================= */

  const renderMatchingWorkspace = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              AI Resume Co-pilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Job Matching
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Discover jobs that fit your profile.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWorkspace}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <BriefcaseBusiness className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              Find your next opportunity
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Job matching will use your resume profile to
              surface relevant opportunities.
            </p>

            <button
              type="button"
              onClick={() =>
                alert(
                  "Job matching pipeline coming next."
                )
              }
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Zap className="h-4 w-4" />
              Find Matching Jobs
            </button>

            <p className="mt-3 text-xs text-slate-400">
              {usage.jobMatches}/
              {FREE_LIMITS.jobMatches} free searches used
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     APPLICATION TRACKER WORKSPACE
     ========================================================= */

  const renderTrackerWorkspace = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
              AI Resume Co-pilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Application Tracker
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Organize and track your job applications.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWorkspace}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <ClipboardList className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              Track every application
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Keep applications, interviews, offers, and
              follow-ups organized.
            </p>

            <button
              type="button"
              onClick={() =>
                alert(
                  "Application tracker pipeline coming next."
                )
              }
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <ClipboardList className="h-4 w-4" />
              Add Application
            </button>

            <p className="mt-3 text-xs text-slate-400">
              {usage.trackedApplications}/
              {FREE_LIMITS.trackedApplications} tracked
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     INSIGHTS WORKSPACE
     ========================================================= */

  const renderInsightsWorkspace = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              AI Resume Co-pilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Insights
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Understand your resume performance.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWorkspace}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <BarChart3 className="h-6 w-6 text-blue-500" />

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Resume uploads
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {resumeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <TrendingUp className="h-6 w-6 text-emerald-500" />

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Latest ATS score
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {atsScore !== null
                ? `${atsScore}%`
                : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Activity className="h-6 w-6 text-purple-500" />

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              ATS scans used
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {usage.atsScans}
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     WORKSPACE RENDERER
     
     IMPORTANT:
     This is the ONE workspace renderer.
     ========================================================= */

  const renderWorkspace = () => {
    switch (activeWorkspace) {
      case "ats":
        return renderATSWorkspace();

      case "tailored":
        return renderTailoredWorkspace();

      case "matching":
        return renderMatchingWorkspace();

      case "tracker":
        return renderTrackerWorkspace();

      case "insights":
        return renderInsightsWorkspace();

      case "overview":
      default:
        return renderOverview();
    }
  };

  /* =========================================================
     FINAL RENDER
     ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ---------------------------------------------------
           TOP NAV
           --------------------------------------------------- */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Bot className="h-5 w-5" />
            </div>

            <span className="font-bold text-slate-900 dark:text-white">
              Workivo
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={closeWorkspace}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeWorkspace === "overview"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={handleATSWorkspace}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeWorkspace === "ats"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              ATS
            </button>

            <button
              type="button"
              onClick={handleTailoredWorkspace}
              className={`hidden rounded-lg px-3 py-2 text-xs font-semibold transition sm:block ${
                activeWorkspace === "tailored"
                  ? "bg-purple-600 text-white"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              AI Resume
            </button>

            <button
              type="button"
              onClick={handleMatchingWorkspace}
              className={`hidden rounded-lg px-3 py-2 text-xs font-semibold transition md:block ${
                activeWorkspace === "matching"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Jobs
            </button>

            <button
              type="button"
              onClick={handleTrackerWorkspace}
              className={`hidden rounded-lg px-3 py-2 text-xs font-semibold transition lg:block ${
                activeWorkspace === "tracker"
                  ? "bg-orange-600 text-white"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Tracker
            </button>

            <button
              type="button"
              onClick={() =>
                openWorkspace("insights")
              }
              className={`hidden rounded-lg px-3 py-2 text-xs font-semibold transition xl:block ${
                activeWorkspace === "insights"
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Insights
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------
           MAIN WORKSPACE
           --------------------------------------------------- */}

        <div
          className={
            showWorkspace
              ? "rounded-3xl"
              : ""
          }
        >
          {renderWorkspace()}
        </div>
      </div>
    </div>
  );
}
      
