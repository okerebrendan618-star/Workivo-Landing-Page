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

  const [isTailoring, setIsTailoring] = useState(false);

  const [jobDescription, setJobDescription] =
    useState("");

  const [tailoredResume, setTailoredResume] =
    useState<string | null>(null);

  /* =========================================================
     JOB MATCHING STATE
     
     NEW:
     These states are only for the Job Matching feature.
     ========================================================= */

  const [isMatching, setIsMatching] = useState(false);

  const [matchingJobs, setMatchingJobs] =
    useState<any[]>([]);

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
     TAILORED RESUME PIPELINE
     ========================================================= */

  const handleTailorResume = async () => {
    if (!latestResume) {
      alert("Please upload a resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter a job description.");
      return;
    }

    if (!canUseTailoredResume) {
      alert(
        "You have reached your free tailored resume limit."
      );
      return;
    }

    if (isTailoring) return;

    setIsTailoring(true);

    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "tailor-resume",
        {
          body: {
            resume_text:
              latestResume.resume_text || "",

            job_description:
              jobDescription.trim(),
          },
        }
      );

      if (error) {
        console.error(
          "TAILOR FUNCTION ERROR:",
          error
        );

        throw new Error(
          error.message ||
            "AI resume tailoring failed."
        );
      }

      if (!data || typeof data !== "object") {
        throw new Error(
          "Invalid AI tailoring response."
        );
      }

      const tailoredText =
        typeof data.tailored_resume === "string"
          ? data.tailored_resume
          : "";

      if (!tailoredText.trim()) {
        throw new Error(
          "AI did not return a tailored resume."
        );
      }

      setTailoredResume(
        tailoredText
      );

      setUsage((previousUsage) => ({
        ...previousUsage,
        tailoredResumes:
          previousUsage.tailoredResumes + 1,
      }));

      alert(
        "Your resume has been tailored successfully!"
      );
    } catch (error) {
      console.error(
        "TAILOR RESUME ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "AI resume tailoring failed."
      );
    } finally {
      setIsTailoring(false);
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
     JOB MATCHING
     
     NEW FEATURE
     
     Flow:
     
     Dashboard
        ↓
     Supabase Edge Function
        ↓
     Make Job Matching Webhook
        ↓
     Himalayas jobs
        ↓
     MiniMax ranking
        ↓
     Edge Function normalization
        ↓
     Dashboard job cards
     ========================================================= */

  const handleFindMatchingJobs = async () => {
    if (!latestResume) {
      alert("Please upload a resume first.");
      return;
    }

    if (!canUseJobMatches) {
      alert(
        "You have reached your free job matching limit."
      );
      return;
    }

    if (isMatching) return;

    const resumeText =
      typeof latestResume.resume_text === "string"
        ? latestResume.resume_text.trim()
        : "";

    if (!resumeText) {
      alert(
        "Your resume does not contain readable text. Please upload your resume again."
      );
      return;
    }

    setIsMatching(true);

    try {
      /* -----------------------------------------------------
         SECURE JOB MATCHING REQUEST
         
         IMPORTANT:
         The Make webhook URL is NOT in the frontend.
         
         Supabase Edge Function:
         job-matching
         
         Only the resume text is sent.
         Make itself fetches the available jobs.
         ----------------------------------------------------- */

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "job-matching",
        {
          body: {
            resume_text: resumeText,
          },
        }
      );

      if (error) {
        console.error(
          "JOB MATCHING FUNCTION ERROR:",
          error
        );

        throw new Error(
          error.message ||
            "Job matching request failed."
        );
      }

      /* -----------------------------------------------------
         RESPONSE VALIDATION
         ----------------------------------------------------- */

      if (
        !data ||
        typeof data !== "object" ||
        !Array.isArray(data.jobs)
      ) {
        throw new Error(
          "Invalid job matching response."
        );
      }

      /* -----------------------------------------------------
         NORMALIZE + SORT JOBS
         
         The Edge Function already normalizes the old
         trailing-space keys, but this extra defensive layer
         prevents the UI from breaking if an older response
         ever reaches the frontend.
         ----------------------------------------------------- */

      const normalizedJobs = data.jobs
        .filter(
          (job: any) =>
            job &&
            typeof job === "object"
        )
        .map((job: any) => ({
          ...job,

          job_id:
            job.job_id ?? "",

          title:
            job.title ?? "",

          companyName:
            job.companyName ?? "",

          excerpt:
            job.excerpt !== undefined
              ? job.excerpt
              : job["excerpt "] ?? "",

          employmentType:
            job.employmentType ?? "",

          seniority:
            job.seniority !== undefined
              ? job.seniority
              : job["seniority "] ?? "",

          categories:
            job.categories !== undefined
              ? job.categories
              : job["categories "] ?? "",

          salaryPeriod:
            job.salaryPeriod ?? "",

          minSalary:
            job.minSalary ?? null,

          maxSalary:
            job.maxSalary !== undefined
              ? job.maxSalary
              : job["maxSalary "] ?? null,

          applicationLink:
            job.applicationLink ?? "",

          timezoneRestriction:
            job.timezoneRestriction ?? "",

          match_score:
            Number(job.match_score) || 0,

          match_level:
            job.match_level ?? "",

          reason:
            job.reason ?? "",

          matching_skills:
            Array.isArray(job.matching_skills)
              ? job.matching_skills.filter(Boolean)
              : [],

          missing_skills:
            Array.isArray(job.missing_skills)
              ? job.missing_skills.filter(Boolean)
              : [],
        }))
        .sort(
          (a: any, b: any) =>
            b.match_score - a.match_score
        );

      if (normalizedJobs.length === 0) {
        throw new Error(
          "No matching jobs were returned. Please try again later."
        );
      }

      /* -----------------------------------------------------
         UPDATE JOB RESULTS
         ----------------------------------------------------- */

      setMatchingJobs(normalizedJobs);

      /* -----------------------------------------------------
         UPDATE UI USAGE
         
         One completed search counts as one job-match search.
         ----------------------------------------------------- */

      setUsage((previousUsage) => ({
        ...previousUsage,
        jobMatches:
          previousUsage.jobMatches + 1,
      }));
    } catch (error) {
      console.error(
        "JOB MATCHING ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Job matching failed."
      );
    } finally {
      setIsMatching(false);
    }
  };

  /* =========================================================
     JOB MATCHING DISPLAY HELPERS
     
     NEW:
     These helpers are only used by the Job Matching workspace.
     ========================================================= */

  const formatSalary = (
    minSalary: any,
    maxSalary: any,
    salaryPeriod: any
  ) => {
    const min =
      Number.isFinite(Number(minSalary))
        ? Number(minSalary)
        : null;

    const max =
      Number.isFinite(Number(maxSalary))
        ? Number(maxSalary)
        : null;

    if (min === null && max === null) {
      return "";
    }

    let salaryText = "";

    if (min !== null && max !== null) {
      salaryText =
        min === max
          ? `${min.toLocaleString()}`
          : `${min.toLocaleString()} – ${max.toLocaleString()}`;
    } else if (min !== null) {
      salaryText = `From ${min.toLocaleString()}`;
    } else if (max !== null) {
      salaryText = `Up to ${max.toLocaleString()}`;
    }

    if (
      typeof salaryPeriod === "string" &&
      salaryPeriod.trim()
    ) {
      return `${salaryText} / ${salaryPeriod}`;
    }

    return salaryText;
  };

  const formatCategories = (
    categories: any
  ) => {
    if (Array.isArray(categories)) {
      return categories
        .filter(Boolean)
        .join(" • ");
    }

    if (
      typeof categories === "string"
    ) {
      return categories.trim();
    }

    return "";
  };

  const getMatchLevelClass = (
    matchLevel: string
  ) => {
    const normalized =
      matchLevel
        .toLowerCase()
        .trim();

    if (
      normalized.includes("excellent") ||
      normalized.includes("strong")
    ) {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (
      normalized.includes("good") ||
      normalized.includes("high")
    ) {
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    }

    if (
      normalized.includes("fair") ||
      normalized.includes("moderate")
    ) {
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    }

    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
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
              Tailor your resume to a specific job.
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

        <div className="grid gap-6 lg:grid-cols-2">

          {/* LEFT SIDE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <WandSparkles className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Tailor Resume
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Match your resume to the job description.
                </p>
              </div>
            </div>

            {/* CURRENT RESUME */}

            <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Resume
              </p>

              <p className="mt-2 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                {latestResume?.file_name
                  ?.split("/")
                  .pop() ||
                  "No resume selected"}
              </p>
            </div>

            {/* JOB DESCRIPTION */}

            <div className="mt-6">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">
                Job Description
              </label>

              <textarea
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(
                    event.target.value
                  )
                }
                placeholder="Paste the job description here..."
                rows={10}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* BUTTON */}

            <button
              type="button"
              onClick={handleTailorResume}
              disabled={
                !latestResume ||
                !jobDescription.trim() ||
                isTailoring ||
                !canUseTailoredResume
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTailoring ? (
                <>
                  <Activity className="h-4 w-4 animate-pulse" />
                  Tailoring Resume...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Tailor Resume
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
              {usage.tailoredResumes}/
              {FREE_LIMITS.tailoredResumes} free rewrites used
            </p>
          </div>

          {/* RIGHT SIDE */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Tailored Resume
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your AI-generated resume will appear here.
                </p>
              </div>
            </div>

            {tailoredResume ? (
              <div className="mt-6">
                <div className="max-h-[600px] overflow-y-auto rounded-xl bg-slate-50 p-5 dark:bg-slate-800/60">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {tailoredResume}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <div>
                  <WandSparkles className="mx-auto h-8 w-8 text-slate-400" />

                  <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                    No tailored resume yet
                  </p>

                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                    Paste a job description and click
                    "Tailor Resume" to generate your customized resume.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     JOB MATCHING WORKSPACE
     
     NEW:
     Full Job Matching UI.
     ========================================================= */

  const renderMatchingWorkspace = () => {
    return (
      <div className="space-y-6">
        {/* ---------------------------------------------------
           HEADER
           --------------------------------------------------- */}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              AI Resume Co-pilot
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Job Matching
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Discover real opportunities ranked against your resume.
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

        {/* ---------------------------------------------------
           SEARCH INTRO / ACTION
           --------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Find jobs matched to your resume
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Workivo analyzes your resume against available
                  opportunities and ranks the strongest matches first.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <FileText className="h-3.5 w-3.5" />
                    {latestResume
                      ? "Resume ready"
                      : "Resume required"}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Zap className="h-3.5 w-3.5" />
                    {Math.max(
                      0,
                      FREE_LIMITS.jobMatches -
                        usage.jobMatches
                    )}{" "}
                    free search
                    {Math.max(
                      0,
                      FREE_LIMITS.jobMatches -
                        usage.jobMatches
                    ) === 1
                      ? ""
                      : "es"}{" "}
                    left
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFindMatchingJobs}
              disabled={
                !latestResume ||
                isMatching ||
                !canUseJobMatches
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMatching ? (
                <>
                  <Activity className="h-4 w-4 animate-pulse" />
                  Finding Jobs...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {matchingJobs.length > 0
                    ? "Find New Matches"
                    : "Find Matching Jobs"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------
           NO RESUME STATE
           --------------------------------------------------- */}

        {!latestResume && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <FileText className="mx-auto h-10 w-10 text-slate-400" />

            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              Upload your resume first
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Job Matching uses the resume you already uploaded to
              understand your skills and find relevant opportunities.
            </p>

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <UploadCloud className="h-4 w-4" />
              {isUploading
                ? "Uploading..."
                : "Upload Resume"}
            </button>
          </div>
        )}

        {/* ---------------------------------------------------
           LOADING STATE
           --------------------------------------------------- */}

        {isMatching && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <BriefcaseBusiness className="h-7 w-7 animate-pulse" />
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                Finding your best matches
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Workivo is searching available opportunities and
                comparing them against your resume.
              </p>

              <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
              </div>

              <p className="mt-4 text-xs text-slate-400">
                This may take a few seconds.
              </p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------
           EMPTY STATE AFTER NO RESULTS
           --------------------------------------------------- */}

        {!isMatching &&
          latestResume &&
          matchingJobs.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <BriefcaseBusiness className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                  Your next opportunity could be here
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Let Workivo compare your resume with available
                  jobs and surface the opportunities that fit you best.
                </p>

                <button
                  type="button"
                  onClick={handleFindMatchingJobs}
                  disabled={
                    !canUseJobMatches ||
                    isMatching
                  }
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          )}

        {/* ---------------------------------------------------
           RESULTS HEADER
           --------------------------------------------------- */}

        {!isMatching &&
          matchingJobs.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Personalized results
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {matchingJobs.length} matching{" "}
                  {matchingJobs.length === 1
                    ? "job"
                    : "jobs"}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Results are ordered from highest match score to lowest.
                </p>
              </div>

              <div className="text-xs text-slate-400">
                {usage.jobMatches}/
                {FREE_LIMITS.jobMatches} free searches used
              </div>
            </div>
          )}

        {/* ---------------------------------------------------
           JOB CARDS
           --------------------------------------------------- */}

        {!isMatching &&
          matchingJobs.length > 0 && (
            <div className="space-y-4">
              {matchingJobs.map(
                (job: any, index: number) => {
                  const matchScore = Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        Number(job.match_score) || 0
                      )
                    )
                  );

                  const salary =
                    formatSalary(
                      job.minSalary,
                      job.maxSalary,
                      job.salaryPeriod
                    );

                  const categories =
                    formatCategories(
                      job.categories
                    );

                  const matchLevel =
                    typeof job.match_level === "string" &&
                    job.match_level.trim()
                      ? job.match_level.trim()
                      : "";

                  const reason =
                    typeof job.reason === "string"
                      ? job.reason.trim()
                      : "";

                  const excerpt =
                    typeof job.excerpt === "string"
                      ? job.excerpt.trim()
                      : "";

                  const applicationLink =
                    typeof job.applicationLink === "string"
                      ? job.applicationLink.trim()
                      : "";

                  const companyName =
                    typeof job.companyName === "string"
                      ? job.companyName.trim()
                      : "";

                  const title =
                    typeof job.title === "string"
                      ? job.title.trim()
                      : "Untitled opportunity";

                  const employmentType =
                    typeof job.employmentType === "string"
                      ? job.employmentType.trim()
                      : "";

                  const seniority =
                    typeof job.seniority === "string"
                      ? job.seniority.trim()
                      : "";

                  const timezoneRestriction =
                    typeof job.timezoneRestriction === "string"
                      ? job.timezoneRestriction.trim()
                      : "";

                  const matchingSkills =
                    Array.isArray(job.matching_skills)
                      ? job.matching_skills.filter(Boolean)
                      : [];

                  const missingSkills =
                    Array.isArray(job.missing_skills)
                      ? job.missing_skills.filter(Boolean)
                      : [];

                  return (
                    <div
                      key={
                        job.job_id ||
                        `${title}-${companyName}-${index}`
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      {/* TOP */}
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              #{index + 1} Match
                            </span>

                            {matchLevel && (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getMatchLevelClass(
                                  matchLevel
                                )}`}
                              >
                                {matchLevel}
                              </span>
                            )}
                          </div>

                          <h4 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                            {title}
                          </h4>

                          {companyName && (
                            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                              {companyName}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {employmentType && (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {employmentType}
                              </span>
                            )}

                            {seniority && (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {seniority}
                              </span>
                            )}

                            {categories && (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {categories}
                              </span>
                            )}

                            {salary && (
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                {salary}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* MATCH SCORE */}
                        <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Match
                            </p>

                            <p className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                              {matchScore}%
                            </p>
                          </div>

                          <div className="h-14 w-14">
                            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
                              <div className="absolute inset-1 flex items-center justify-center rounded-full bg-white dark:bg-slate-900">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  FIT
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* EXCERPT */}
                      {excerpt && (
                        <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Job overview
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {excerpt}
                          </p>
                        </div>
                      )}

                      {/* AI REASON */}
                      {reason && (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/10 dark:bg-emerald-500/5">
                          <div className="flex items-start gap-3">
                            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Why Workivo matched it
                              </p>

                              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                                {reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SKILLS */}
                      {(matchingSkills.length > 0 ||
                        missingSkills.length > 0) && (
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          {/* MATCHING SKILLS */}
                          {matchingSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Matching skills
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {matchingSkills.map(
                                  (
                                    skill: any,
                                    skillIndex: number
                                  ) => (
                                    <span
                                      key={`${String(
                                        skill
                                      )}-${skillIndex}`}
                                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    >
                                      {String(skill)}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* MISSING SKILLS */}
                          {missingSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Skills to strengthen
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {missingSkills.map(
                                  (
                                    skill: any,
                                    skillIndex: number
                                  ) => (
                                    <span
                                      key={`${String(
                                        skill
                                      )}-${skillIndex}`}
                                      className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                    >
                                      {String(skill)}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* BOTTOM INFO + APPLY */}
                      <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          {timezoneRestriction && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                Location / timezone:
                              </span>{" "}
                              {timezoneRestriction}
                            </p>
                          )}

                          <p className="text-xs text-slate-400">
                            Review the full job details before applying.
                          </p>
                        </div>

                        {applicationLink ? (
                          <a
                            href={applicationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                          >
                            Apply Now
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400 dark:bg-slate-800">
                            Application link unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

        {/* ---------------------------------------------------
           SEARCH AGAIN
           --------------------------------------------------- */}

        {!isMatching &&
          matchingJobs.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Want another set of opportunities?
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Run another matching search to refresh your results.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFindMatchingJobs}
                  disabled={
                    isMatching ||
                    !canUseJobMatches
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                >
                  <Zap className="h-4 w-4" />
                  Find New Matches
                </button>
              </div>
            </div>
          )}
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
