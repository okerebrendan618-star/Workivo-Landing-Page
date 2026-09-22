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
  LayoutDashboard,
  Send,
  LogOut,
  Menu,
  Plus,
  Target,
  Globe2,
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
     WORKIVO BOT UI

     This is the frontend shell for the Workivo assistant.
     The AI/backend connection can be added later without
     changing the floating UI.
     ========================================================= */

  type BotMessage = {
    role: "user" | "assistant";
    text: string;
  };

  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botInput, setBotInput] = useState("");
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      role: "assistant",
      text:
        "Hey 👋 I’m Workivo Bot. I’ll be able to help with your resume, ATS score, job matches, and applications soon.",
    },
  ]);

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
     ATS, tailored resume, and tracker counters are still
     persisted by their existing frontend flows.

     Job Matching usage is now server-enforced by the
     Edge Function + database. The frontend only displays
     and syncs the server-returned Job Matching count.
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
    | "insights"
    | "bot"
    | null;

  const [activeWorkspace, setActiveWorkspace] =
    useState<Workspace>("overview");

  const [showWorkspace, setShowWorkspace] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /*
   * NEW:
   * Controls the compact desktop dashboard navigation menu.
   * This does not change any workspace logic.
   */
  const [dashboardMenuOpen, setDashboardMenuOpen] =
    useState(false);

  const openWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    setShowWorkspace(workspace !== "overview");
  };

  const closeWorkspace = () => {
    setShowWorkspace(false);
    setActiveWorkspace("overview");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      alert(error.message || "Unable to logout.");
      return;
    }

    window.location.reload();
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
     SUPABASE PERSISTENCE HELPERS
     ========================================================= */

  const persistUsage = async (
    userId: string,
    nextUsage: {
      atsScans: number;
      tailoredResumes: number;
      jobMatches: number;
      trackedApplications: number;
    }
  ) => {
    /*
     * Update the existing row when it exists. If the user does
     * not have a usage row yet, create one with the authenticated
     * user's ID.
     */
    const {
      data: existingUsageRows,
      error: lookupError,
    } = await supabase
      .from("user_usage")
      .select("user_id")
      .eq("user_id", userId)
      .limit(1);

    const existingUsage =
      existingUsageRows?.[0] ?? null;

    if (lookupError) {
      throw new Error(
        `Usage lookup failed: ${lookupError.message}`
      );
    }

    const payload = {
      ats_scans: nextUsage.atsScans,
      tailored_resumes: nextUsage.tailoredResumes,
      job_matches: nextUsage.jobMatches,
      tracked_applications: nextUsage.trackedApplications,
    };

    if (existingUsage) {
      const { error: updateError } = await supabase
        .from("user_usage")
        .update(payload)
        .eq("user_id", userId);

      if (updateError) {
        throw new Error(
          `Usage update failed: ${updateError.message}`
        );
      }

      return;
    }

    const { error: insertError } = await supabase
      .from("user_usage")
      .insert({
        user_id: userId,
        ...payload,
      });

    if (insertError) {
      throw new Error(
        `Usage insert failed: ${insertError.message}`
      );
    }
  };

  const loadPersistentDashboardData = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("AUTH ERROR:", authError);
      return;
    }

    if (!user) return;

    const [
      latestResumeResult,
      resumeCountResult,
      usageResult,
      tailoredResult,
    ] = await Promise.all([
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("resumes")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id),

      supabase
        .from("user_usage")
        .select(
          "ats_scans, tailored_resumes, job_matches, tracked_applications"
        )
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("tailored_resumes")
        .select(
          "id, resume_id, job_description, tailored_resume, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
    ]);

    if (latestResumeResult.error) {
      console.error(
        "LATEST RESUME ERROR:",
        latestResumeResult.error
      );
    } else if (latestResumeResult.data) {
      setLatestResume(latestResumeResult.data);
    }

    if (resumeCountResult.error) {
      console.error(
        "RESUME COUNT ERROR:",
        resumeCountResult.error
      );
    } else {
      setResumeCount(resumeCountResult.count || 0);
    }

    if (usageResult.error) {
      console.error(
        "USAGE LOAD ERROR:",
        usageResult.error
      );
    } else if (usageResult.data) {
      setUsage({
        atsScans:
          Number(usageResult.data.ats_scans) || 0,

        tailoredResumes:
          Number(usageResult.data.tailored_resumes) || 0,

        jobMatches:
          Number(usageResult.data.job_matches) || 0,

        trackedApplications:
          Number(
            usageResult.data.tracked_applications
          ) || 0,
      });
    } else {
      try {
        await persistUsage(user.id, {
          atsScans: 0,
          tailoredResumes: 0,
          jobMatches: 0,
          trackedApplications: 0,
        });
      } catch (error) {
        console.error(
          "INITIAL USAGE CREATE ERROR:",
          error
        );
      }
    }

    if (tailoredResult.error) {
      console.error(
        "TAILORED RESUME LOAD ERROR:",
        tailoredResult.error
      );
    } else if (tailoredResult.data) {
      setTailoredResume(
        tailoredResult.data.tailored_resume || null
      );

      setJobDescription(
        tailoredResult.data.job_description || ""
      );
    }
  };

  /* =========================================================
     LOAD USER DATA AFTER REFRESH
     ========================================================= */

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await loadPersistentDashboardData();
      } catch (error) {
        console.error(
          "DASHBOARD DATA LOAD ERROR:",
          error
        );
      }
    };

    if (isMounted) {
      load();
    }

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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          authError?.message ||
            "Please login again before saving your tailored resume."
        );
      }

      /*
       * Save every successful generation in Supabase.
       * The user_id is taken from the authenticated session,
       * not from user-entered data.
       */
      const { error: saveError } = await supabase
        .from("tailored_resumes")
        .insert({
          user_id: user.id,
          resume_id: latestResume.id,
          job_description: jobDescription.trim(),
          tailored_resume: tailoredText,
        });

      if (saveError) {
        console.error(
          "TAILORED RESUME SAVE ERROR:",
          saveError
        );

        throw new Error(
          `Your resume was generated, but could not be saved: ${saveError.message}`
        );
      }

      const nextTailoredCount =
        usage.tailoredResumes + 1;

      /*
       * Persist usage only after the tailored resume itself has
       * been saved successfully.
       */
      await persistUsage(user.id, {
        ...usage,
        tailoredResumes: nextTailoredCount,
      });

      setTailoredResume(tailoredText);

      setUsage((previousUsage) => ({
        ...previousUsage,
        tailoredResumes: nextTailoredCount,
      }));

      alert(
        "Your resume has been tailored and saved successfully!"
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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          authError?.message ||
            "Please login again before saving usage."
        );
      }

      const nextAtsCount =
        usage.atsScans + 1;

      await persistUsage(user.id, {
        ...usage,
        atsScans: nextAtsCount,
      });

      setUsage((previousUsage) => ({
        ...previousUsage,
        atsScans: nextAtsCount,
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
         SYNC USAGE FROM THE EDGE FUNCTION

         IMPORTANT:
         The Job Matching Edge Function + database are now
         the source of truth for Job Matching usage.

         Do NOT increment jobMatches locally and do NOT call
         persistUsage() here.

         The Edge Function has already reserved the usage
         before Make was called.

         On success, the Edge Function returns:

         data.usage.job_matches
         ----------------------------------------------------- */

      const serverJobMatchCount =
        Number(data?.usage?.job_matches);

      if (
        !Number.isFinite(serverJobMatchCount) ||
        serverJobMatchCount < 0
      ) {
        throw new Error(
          "Job matching response did not contain valid usage information."
        );
      }

      /* -----------------------------------------------------
         UPDATE JOB RESULTS

         Only update the visible jobs after the complete
         response has passed validation.
         ----------------------------------------------------- */

      setMatchingJobs(normalizedJobs);

      setUsage((previousUsage) => ({
        ...previousUsage,
        jobMatches: Math.min(
          FREE_LIMITS.jobMatches,
          serverJobMatchCount
        ),
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
     WORKIVO BOT UI HANDLERS
     ========================================================= */

  const handleBotSubmit = () => {
    const message = botInput.trim();

    if (!message) return;

    setBotMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        text: message,
      },
      {
        role: "assistant",
        text:
          "I’m connected to the Workivo dashboard UI, but my AI backend isn’t connected yet. Once the bot backend is ready, I’ll be able to answer this properly.",
      },
    ]);

    setBotInput("");
  };

  const handleBotKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleBotSubmit();
    }
  };

  /* =========================================================
     OVERVIEW CARD
     ========================================================= */

  const renderOverview = () => {
    return (
      <div className="relative isolate space-y-6">
        {/* ---------------------------------------------------
           AMBIENT DASHBOARD LIGHTING

           NEW:
           Very subtle blue/purple ambient lighting gives the
           dashboard a product-environment feel without turning
           the interface into a neon/particle-heavy landing page.

           This is purely visual and does not affect functionality.
           --------------------------------------------------- */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-20 -top-24 -z-10 h-80 overflow-hidden"
        >
          <div className="absolute left-[8%] top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />

          <div className="absolute right-[10%] top-6 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />

          <div className="absolute left-1/2 top-24 h-40 w-96 -translate-x-1/2 rounded-full bg-cyan-500/5 blur-3xl dark:bg-cyan-500/10" />
        </div>

        {/* ---------------------------------------------------
           HEADER
           --------------------------------------------------- */}

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65 dark:shadow-[0_18px_70px_rgba(2,6,23,0.28)] sm:p-6">
          {/* Subtle top light line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent dark:via-purple-400/40"
          />

          {/* Subtle internal ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10"
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* Product identity/status */}
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 backdrop-blur-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
                </span>

                Workivo AI Co-pilot
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                AI Resume{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                  Dashboard
                </span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Upload your resume, improve your ATS score,
                and manage your job applications.
              </p>
            </div>

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(79,70,229,0.34)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {/* Button shimmer */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />

              <UploadCloud className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />

              <span className="relative">
                {isUploading
                  ? "Uploading..."
                  : "Upload Resume"}
              </span>
            </button>
          </div>
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

<div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/80 hover:shadow-[0_12px_40px_rgba(37,99,235,0.08)] dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-blue-500/20 dark:hover:shadow-[0_12px_40px_rgba(59,130,246,0.08)]">
  <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl transition-opacity duration-300 group-hover:bg-blue-500/10" />

  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm dark:border-blue-500/10 dark:from-blue-500/10 dark:to-indigo-500/10 dark:text-blue-400">
        <FileText className="h-6 w-6" />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Latest Resume
          </p>

          {latestResume && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Ready
            </span>
          )}
        </div>

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
    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/70 hover:shadow-[0_16px_45px_rgba(37,99,235,0.10)] dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-blue-500/30 dark:hover:shadow-[0_16px_45px_rgba(59,130,246,0.10)]"
  >
    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-blue-500/5 blur-3xl transition-all duration-500 group-hover:bg-blue-500/15" />

    <div className="relative flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:border-blue-500/10 dark:from-blue-500/10 dark:to-indigo-500/10 dark:text-blue-400">
        <ScanSearch className="h-5 w-5" />
      </div>

      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-500" />
    </div>

    <h3 className="relative mt-5 font-semibold text-slate-900 dark:text-white">
      ATS Scanner
    </h3>

    <p className="relative mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
      Check how well your resume matches ATS
      requirements.
    </p>

    <div className="relative mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {usage.atsScans}/{FREE_LIMITS.atsScans} used
        </span>

        {atsScore !== null && (
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {atsScore}% score
          </span>
        )}
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                (usage.atsScans / FREE_LIMITS.atsScans) * 100
              )
            )}%`,
          }}
        />
      </div>
    </div>
  </button>

  {/* TAILORED RESUME */}
  <button
    type="button"
    onClick={handleTailoredWorkspace}
    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/70 hover:shadow-[0_16px_45px_rgba(147,51,234,0.10)] dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-purple-500/30 dark:hover:shadow-[0_16px_45px_rgba(147,51,234,0.10)]"
  >
    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-purple-500/5 blur-3xl transition-all duration-500 group-hover:bg-purple-500/15" />

    <div className="relative flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50 text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:border-purple-500/10 dark:from-purple-500/10 dark:to-fuchsia-500/10 dark:text-purple-400">
        <WandSparkles className="h-5 w-5" />
      </div>

      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-purple-500" />
    </div>

    <h3 className="relative mt-5 font-semibold text-slate-900 dark:text-white">
      AI Resume Writer
    </h3>

    <p className="relative mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
      Tailor your resume to a specific job
      description.
    </p>

    <div className="relative mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {usage.tailoredResumes}/
          {FREE_LIMITS.tailoredResumes} used
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-all duration-700"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                (usage.tailoredResumes /
                  FREE_LIMITS.tailoredResumes) *
                  100
              )
            )}%`,
          }}
        />
      </div>
    </div>
  </button>

  {/* JOB MATCHING */}
  <button
    type="button"
    onClick={handleMatchingWorkspace}
    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:shadow-[0_16px_45px_rgba(16,185,129,0.10)] dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-emerald-500/30 dark:hover:shadow-[0_16px_45px_rgba(16,185,129,0.10)]"
  >
    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-500/5 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/15" />

    <div className="relative flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:border-emerald-500/10 dark:from-emerald-500/10 dark:to-teal-500/10 dark:text-emerald-400">
        <BriefcaseBusiness className="h-5 w-5" />
      </div>

      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
    </div>

    <h3 className="relative mt-5 font-semibold text-slate-900 dark:text-white">
      Job Matching
    </h3>

    <p className="relative mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
      Find opportunities that fit your resume
      and skills.
    </p>

    <div className="relative mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {usage.jobMatches}/{FREE_LIMITS.jobMatches} used
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-700"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                (usage.jobMatches / FREE_LIMITS.jobMatches) *
                  100
              )
            )}%`,
          }}
        />
      </div>
    </div>
  </button>

  {/* TRACKER */}
  <button
    type="button"
    onClick={handleTrackerWorkspace}
    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/70 hover:shadow-[0_16px_45px_rgba(249,115,22,0.10)] dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-orange-500/30 dark:hover:shadow-[0_16px_45px_rgba(249,115,22,0.10)]"
  >
    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-orange-500/5 blur-3xl transition-all duration-500 group-hover:bg-orange-500/15" />

    <div className="relative flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-600 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:border-orange-500/10 dark:from-orange-500/10 dark:to-amber-500/10 dark:text-orange-400">
        <ClipboardList className="h-5 w-5" />
      </div>

      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-500" />
    </div>

    <h3 className="relative mt-5 font-semibold text-slate-900 dark:text-white">
      Job Tracker
    </h3>

    <p className="relative mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
      Keep every application organized in one
      place.
    </p>

    <div className="relative mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {usage.trackedApplications}/
          {FREE_LIMITS.trackedApplications} tracked
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                (usage.trackedApplications /
                  FREE_LIMITS.trackedApplications) *
                  100
              )
            )}%`,
          }}
        />
      </div>
    </div>
  </button>
</div>

{/* ---------------------------------------------------
   ATS QUICK ACTION
   --------------------------------------------------- */}

<div className="group relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-white/80 via-white/70 to-blue-50/60 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-blue-300/80 hover:shadow-[0_18px_55px_rgba(37,99,235,0.10)] dark:border-blue-500/10 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-blue-950/30 dark:hover:border-blue-500/20">
  <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-blue-500/15" />

  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/10">
          <Sparkles className="h-4 w-4" />
        </div>

        <h2 className="font-semibold text-slate-900 dark:text-white">
          Ready to scan your resume?
        </h2>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Upload a PDF resume and run an ATS scan
        to receive a score and AI feedback.
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        {Math.max(
          0,
          FREE_LIMITS.atsScans - usage.atsScans
        )}{" "}
        free scans remaining
      </div>
    </div>

    <button
      type="button"
      onClick={handleScanResume}
      disabled={
        !latestResume ||
        isScanning ||
        !canUseATS
      }
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(37,99,235,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_12px_30px_rgba(37,99,235,0.30)] disabled:cursor-not-allowed disabled:opacity-50"
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
  <div className="group relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/75 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_45px_rgba(37,99,235,0.08)] dark:border-blue-500/10 dark:bg-slate-900/70">
    <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />

    <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
      <div
        className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-[6px]"
        style={{
          background: `conic-gradient(rgb(37 99 235) ${Math.min(
            100,
            Math.max(0, atsScore)
          )}%, rgb(226 232 240) ${Math.min(
            100,
            Math.max(0, atsScore)
          )}% 100%)`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {atsScore}
            </div>

            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              ATS
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Latest ATS Result
          </h2>

          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:border-blue-500/10 dark:bg-blue-500/10 dark:text-blue-400">
            {atsScore}/100
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-700"
            style={{
              width: `${Math.min(
                100,
                Math.max(0, atsScore)
              )}%`,
            }}
          />
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">
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
  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/70 hover:shadow-[0_14px_40px_rgba(37,99,235,0.07)] dark:border-slate-800/80 dark:bg-slate-900/65 dark:hover:border-blue-500/20">
    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10" />

    <div className="relative flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
        <FileText className="h-5 w-5" />
      </div>

      <span className="text-sm text-slate-500 dark:text-slate-400">
        Resumes
      </span>
    </div>

    <p className="relative mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
      {resumeCount}
    </p>

    <p className="mt-1 text-xs text-slate-400">
      Uploaded to Workivo
    </p>
  </div>

  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/70 hover:shadow-[0_14px_40px_rgba(37,99,235,0.07)] dark:border-slate-800/80 dark:bg-slate-900/65 dark:hover:border-blue-500/20">
    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10" />

    <div className="relative flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
        <ScanSearch className="h-5 w-5" />
      </div>

      <span className="text-sm text-slate-500 dark:text-slate-400">
        ATS Scans
      </span>
    </div>

    <p className="relative mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
      {usage.atsScans}
    </p>

    <p className="mt-1 text-xs text-slate-400">
      Resume analyses completed
    </p>
  </div>

  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200/70 hover:shadow-[0_14px_40px_rgba(16,185,129,0.07)] dark:border-slate-800/80 dark:bg-slate-900/65 dark:hover:border-emerald-500/20">
    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10" />

    <div className="relative flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400">
        <TrendingUp className="h-5 w-5" />
      </div>

      <span className="text-sm text-slate-500 dark:text-slate-400">
        Best ATS Score
      </span>
    </div>

    <p className="relative mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
      {atsScore !== null
        ? `${atsScore}%`
        : "—"}
    </p>

    <p className="mt-1 text-xs text-slate-400">
      Latest recorded score
    </p>
  </div>

  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200/70 hover:shadow-[0_14px_40px_rgba(245,158,11,0.07)] dark:border-slate-800/80 dark:bg-slate-900/65 dark:hover:border-amber-500/20">
    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-amber-500/5 blur-2xl group-hover:bg-amber-500/10" />

    <div className="relative flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
        <Zap className="h-5 w-5" />
      </div>

      <span className="text-sm text-slate-500 dark:text-slate-400">
        Free ATS Left
      </span>
    </div>

    <p className="relative mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
      {Math.max(
        0,
        FREE_LIMITS.atsScans -
          usage.atsScans
      )}
    </p>

    <p className="mt-1 text-xs text-slate-400">
  Available before upgrade
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

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ATS Scanner
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analyze your resume against ATS requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={closeWorkspace}
          className="rounded-xl border border-slate-200/80 bg-white/70 p-2.5 text-slate-500 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:text-blue-500 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-blue-500/20 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/75 p-6 shadow-sm backdrop-blur-xl dark:border-blue-500/10 dark:bg-slate-900/70 lg:col-span-2">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/10 dark:bg-blue-500/10 dark:text-blue-400">
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

          <div className="relative mt-8">
            {atsScore !== null ? (
              <div>
                <div className="flex items-end gap-2">
                  <div className="text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                    {atsScore}
                  </div>

                  <span className="mb-2 text-2xl text-slate-400">
                    /100
                  </span>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-all duration-700"
                    style={{
                      width: `${atsScore}%`,
                    }}
                  />
                </div>

                <div className="mt-6 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {atsFeedback ||
                      "No additional feedback provided."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/30">
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
            className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(37,99,235,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="rounded-2xl border border-purple-200/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-purple-500/10 dark:bg-slate-900/65">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400">
                <Bot className="h-5 w-5" />
              </div>

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

          <div className="rounded-2xl border border-emerald-200/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-emerald-500/10 dark:bg-slate-900/65">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white">
                Secure Pipeline
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Browser → Supabase Edge Function → Make →
              ATS result.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-amber-500/10 dark:bg-slate-900/65">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
                <Zap className="h-5 w-5" />
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white">
                Free Usage
              </h3>
            </div>

            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {usage.atsScans} of{" "}
              {FREE_LIMITS.atsScans} ATS scans used.
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{
                  width: `${Math.min(
                    100,
                    (usage.atsScans /
                      FREE_LIMITS.atsScans) *
                      100
                  )}%`,
                }}
              />
            </div>
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

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Resume Writer
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tailor your resume to a specific job description.
          </p>
        </div>

        <button
          type="button"
          onClick={closeWorkspace}
          className="rounded-xl border border-slate-200/80 bg-white/70 p-2.5 text-slate-500 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-200 hover:bg-white hover:text-purple-500 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-purple-500/20 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-white/75 p-6 shadow-sm backdrop-blur-xl dark:border-purple-500/10 dark:bg-slate-900/70">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-500/10 dark:bg-purple-500/10 dark:text-purple-400">
              <WandSparkles className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Tailor Your Resume
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add the job description below.
              </p>
            </div>
          </div>

          <label className="relative mt-6 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Job Description
            </span>

            <textarea
              value={jobDescription}
              onChange={(event) =>
                setJobDescription(event.target.value)
              }
              placeholder="Paste the job description here..."
              className="mt-2 min-h-[220px] w-full resize-y rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white"
            />
          </label>

          <button
            type="button"
            onClick={handleTailorResume}
            disabled={
              !latestResume ||
              !jobDescription.trim() ||
              isTailoring ||
              !canUseTailoredResume
            }
            className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(147,51,234,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:from-purple-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTailoring ? (
              <>
                <Activity className="h-4 w-4 animate-pulse" />
                Tailoring Resume...
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" />
                Tailor Resume
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            {usage.tailoredResumes}/
            {FREE_LIMITS.tailoredResumes} free generations used
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />

          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Generated Resume
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                Your Tailored Version
              </h3>
            </div>

            {tailoredResume && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            )}
          </div>

          <div className="relative mt-6 min-h-[420px] rounded-xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
            {tailoredResume ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700 dark:text-slate-300">
                {tailoredResume}
              </pre>
            ) : (
              <div className="flex min-h-[380px] items-center justify-center text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-500 dark:bg-purple-500/10 dark:text-purple-400">
                    <WandSparkles className="h-6 w-6" />
                  </div>

                  <p className="mt-4 font-medium text-slate-700 dark:text-slate-300">
                    No tailored resume yet
                  </p>

                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                    Add a job description and generate your
                    personalized resume.
                  </p>
                </div>
              </div>
            )}
          </div>
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
      {/* ---------------------------------------------------
         HEADER
         --------------------------------------------------- */}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            AI Resume Co-pilot
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Job Matching
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Discover real opportunities ranked against your resume.
          </p>
        </div>

        <button
          type="button"
          onClick={closeWorkspace}
          className="rounded-xl border border-slate-200/80 bg-white/70 p-2.5 text-slate-500 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:text-emerald-500 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-500/20 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ---------------------------------------------------
         SEARCH INTRO / ACTION
         --------------------------------------------------- */}

      <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white/80 via-white/70 to-emerald-50/40 p-6 shadow-sm backdrop-blur-xl dark:border-emerald-500/10 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-emerald-950/20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/8 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400">
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <FileText className="h-3.5 w-3.5" />
                  {latestResume
                    ? "Resume ready"
                    : "Resume required"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400">
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
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(16,185,129,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <FileText className="h-7 w-7" />
          </div>

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
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-white/70 p-10 shadow-sm backdrop-blur-xl dark:border-emerald-500/10 dark:bg-slate-900/65">
          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400">
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
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
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
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-10 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/65">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400">
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
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(16,185,129,0.18)] transition-all hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
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

              <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {matchingJobs.length} matching{" "}
                {matchingJobs.length === 1
                  ? "job"
                  : "jobs"}
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Results are ordered from highest match score to lowest.
              </p>
            </div>

            <div className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
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
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200/80 hover:shadow-[0_18px_50px_rgba(16,185,129,0.08)] dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-emerald-500/20"
                  >
                    <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/10" />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400">
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

                        <h4 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {title}
                        </h4>

                        {companyName && (
                          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                            {companyName}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {employmentType && (
                            <span className="rounded-lg border border-slate-200/70 bg-slate-100/70 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                              {employmentType}
                            </span>
                          )}

                          {seniority && (
                            <span className="rounded-lg border border-slate-200/70 bg-slate-100/70 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                              {seniority}
                            </span>
                          )}

                          {categories && (
                            <span className="rounded-lg border border-slate-200/70 bg-slate-100/70 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                              {categories}
                            </span>
                          )}

                          {salary && (
                            <span className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400">
                              {salary}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* MATCH SCORE */}
                      <div className="relative flex shrink-0 items-center gap-4 rounded-2xl border border-emerald-100/70 bg-emerald-50/50 p-4 dark:border-emerald-500/10 dark:bg-emerald-500/5">
                        <div className="text-right">
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
                            Match
                          </p>

                          <p className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {matchScore}%
                          </p>
                        </div>

                        <div
                          className="relative h-14 w-14 rounded-full p-[4px]"
                          style={{
                            background: `conic-gradient(rgb(16 185 129) ${matchScore}%, rgb(226 232 240) ${matchScore}% 100%)`,
                          }}
                        >
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              FIT
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXCERPT */}
                    {excerpt && (
                      <div className="relative mt-5 rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Job overview
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {excerpt}
                        </p>
                      </div>
                    )}

                    {/* AI REASON */}
                    {reason && (
                      <div className="relative mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-500/10 dark:bg-emerald-500/5">
                        <div className="flex items-start gap-3">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
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
                      <div className="relative mt-5 grid gap-4 md:grid-cols-2">
                        {/* MATCHING SKILLS */}
                        {matchingSkills.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
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
                                    className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400"
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
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
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
                                    className="rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-500/10 dark:bg-amber-500/10 dark:text-amber-400"
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

                    {timezoneRestriction && (
                      <div className="relative mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />

                        <span>
                          {timezoneRestriction}
                        </span>
                      </div>
                    )}

                    <div className="relative mt-5 flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                      <div className="text-xs text-slate-400">
                        {job.job_id
                          ? `Job ID: ${job.job_id}`
                          : "Matched opportunity"}
                      </div>

                      {applicationLink ? (
                        <a
                          href={applicationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          View & Apply
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
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
    </div>
  );
};

/* =========================================================
   TRACKER WORKSPACE
   ========================================================= */

const renderTrackerWorkspace = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
            AI Resume Co-pilot
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Application Tracker
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Keep track of your job applications in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={closeWorkspace}
          className="rounded-xl border border-slate-200/80 bg-white/70 p-2.5 text-slate-500 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:text-orange-500 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-orange-500/20 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-orange-200/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-orange-500/10 dark:bg-slate-900/65 lg:col-span-2">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange-500/5 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/10 dark:bg-orange-500/10 dark:text-orange-400">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Your Applications
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Track the jobs you have applied for.
              </p>
            </div>
          </div>

          <div className="relative mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <ClipboardList className="mx-auto h-9 w-9 text-slate-400" />

            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              No applications tracked yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Your application tracker is ready for the next stage of
              your job search.
            </p>

            <button
              type="button"
              disabled
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Application
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="group relative overflow-hidden rounded-2xl border border-orange-200/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(249,115,22,0.08)] dark:border-orange-500/10 dark:bg-slate-900/65">
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-orange-500/5 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400">
                <BarChart3 className="h-5 w-5" />
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white">
                Applications
              </h3>
            </div>

            <p className="relative mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {usage.trackedApplications}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Applications currently tracked.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-blue-200/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(37,99,235,0.08)] dark:border-blue-500/10 dark:bg-slate-900/65">
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
                <Target className="h-5 w-5" />
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white">
                Stay Organized
              </h3>
            </div>

            <p className="relative mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Keep your applications, interview stages, and job-search
              progress organized as you apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   FLOATING WORKIVO BOT
   ========================================================= */

const renderBotWorkspace = () => {
  return (
    <div className="fixed bottom-[82px] right-5 z-50 flex h-[580px] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.28),0_0_50px_rgba(124,58,237,0.08)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-[0_30px_90px_rgba(0,0,0,0.45),0_0_50px_rgba(124,58,237,0.10)] sm:right-6">
      <div className="relative flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
        <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-48 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-blue-500 text-white shadow-[0_0_25px_rgba(139,92,246,0.35)]">
            <div className="absolute inset-0 rounded-xl bg-white/10" />
            <Bot className="relative h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white">
                Workivo AI
              </h2>

              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your resume co-pilot
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBotOpen(false)}
          className="relative rounded-xl border border-slate-200/80 bg-white/60 p-2 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:text-violet-500 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-violet-500/20 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {botMessages.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center text-center">
            <div className="max-w-md">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 text-violet-600 shadow-[0_0_35px_rgba(139,92,246,0.10)] dark:text-violet-400">
                <div className="absolute inset-0 rounded-2xl border border-violet-300/20 dark:border-violet-500/10" />
                <Bot className="relative h-7 w-7" />
              </div>

              <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                How can I help?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Ask Workivo about your resume, ATS score, job search,
                or application strategy.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  Resume help
                </span>

                <span className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  ATS advice
                </span>

                <span className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  Job search
                </span>
              </div>
            </div>
          </div>
        ) : (
          botMessages.map(
            (
              message: {
                role: "user" | "assistant";
                text: string;
              },
              index: number
            ) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-[0_8px_20px_rgba(124,58,237,0.15)]"
                      : "border border-slate-200/70 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            )
          )
        )}
      </div>

      <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-sm backdrop-blur-md transition-all duration-200 focus-within:border-violet-300 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.08)] dark:border-slate-700 dark:bg-slate-950/60 dark:focus-within:border-violet-500/30">
          <input
            value={botInput}
            onChange={(event) =>
              setBotInput(event.target.value)
            }
            onKeyDown={handleBotKeyDown}
            placeholder="Ask Workivo anything..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />

          <button
            type="button"
            onClick={handleBotSubmit}
            disabled={!botInput.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-[0_5px_18px_rgba(124,58,237,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(124,58,237,0.30)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   WORKSPACE ROUTER
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

    case "bot":
      return renderBotWorkspace();

    default:
      return renderOverview();
  }
};

/* =========================================================
   SIDEBAR
   ========================================================= */

const sidebarItems = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "ats",
    label: "ATS Scanner",
    icon: ScanSearch,
  },
  {
    id: "tailored",
    label: "AI Resume Writer",
    icon: WandSparkles,
  },
  {
    id: "matching",
    label: "Job Matching",
    icon: BriefcaseBusiness,
  },
  {
    id: "tracker",
    label: "Application Tracker",
    icon: ClipboardList,
  },
] as const;

/* =========================================================
   MAIN DASHBOARD RENDER
   ========================================================= */

return (
  <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
    <div className="flex min-h-screen">
      {/* ---------------------------------------------------
         DESKTOP SIDEBAR
         --------------------------------------------------- */}

      <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/80 backdrop-blur-xl lg:flex lg:flex-col dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex h-20 items-center border-b border-slate-200/80 px-6 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveWorkspace("overview");
              setDashboardMenuOpen(false);
            }}
            className="group text-left"
          >
            <div className="text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              Workivo
            </div>

            <div className="text-[11px] font-medium text-slate-400">
              AI Resume Co-pilot
            </div>
          </button>
        </div>

        {/* -------------------------------------------------
           CLEAN SIDEBAR SPACE
           ------------------------------------------------- */}

        <div className="flex-1" />

        {/* -------------------------------------------------
           MENU + LOGOUT
           ------------------------------------------------- */}

        <div className="relative border-t border-slate-200/80 p-4 dark:border-slate-800/80">
          {dashboardMenuOpen && (
            <div className="absolute bottom-[76px] left-4 right-4 z-50 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
              <div className="px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dashboard
                </p>
              </div>

              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;

                  const active =
                    activeWorkspace === item.id ||
                    (
                      item.id === "overview" &&
                      activeWorkspace === null
                    );

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveWorkspace(
                          item.id === "overview"
                            ? null
                            : item.id
                        );

                        setDashboardMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm dark:from-white dark:to-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />

                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDashboardMenuOpen(
                  (previous) => !previous
                )
              }
              aria-expanded={dashboardMenuOpen}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                dashboardMenuOpen
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <Menu className="h-4 w-4" />
              Menu
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------
         MAIN AREA
         --------------------------------------------------- */}

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* -------------------------------------------------
           AMBIENT DASHBOARD LIGHTING
           ------------------------------------------------- */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-500/8" />

          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl dark:bg-purple-500/8" />

          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/4 blur-3xl dark:bg-indigo-500/6" />
        </div>

        {/* MOBILE HEADER */}

        <header className="relative z-10 flex h-16 items-center justify-center border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl lg:hidden dark:border-slate-800/80 dark:bg-slate-900/75">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="absolute left-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkspace(null)}
            className="text-center"
          >
            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Workivo
            </div>

            <div className="text-[9px] font-medium text-slate-400">
              AI Resume Co-pilot
            </div>
          </button>
        </header>

        {/* -------------------------------------------------
           MOBILE DRAWER
           ------------------------------------------------- */}

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() =>
                setMobileMenuOpen(false)
              }
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <aside className="relative flex h-full w-72 flex-col border-r border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
              <div className="flex h-20 items-center justify-between border-b border-slate-200/80 px-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace(null);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left"
                >
                  <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Workivo
                  </div>

                  <div className="text-[11px] font-medium text-slate-400">
                    AI Resume Co-pilot
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 p-4">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;

                  const active =
                    activeWorkspace === item.id ||
                    (
                      item.id === "overview" &&
                      activeWorkspace === null
                    );

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveWorkspace(
                          item.id === "overview"
                            ? null
                            : item.id
                        );

                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm dark:from-white dark:to-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />

                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* -------------------------------------------------
           PAGE CONTENT
           ------------------------------------------------- */}

        <main className="relative z-10 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {renderWorkspace()}
          </div>
        </main>

        {/* -------------------------------------------------
           FLOATING WORKIVO BOT BUTTON + PANEL
           ------------------------------------------------- */}

        {isBotOpen && renderBotWorkspace()}

        <button
          type="button"
          onClick={() =>
            setIsBotOpen((previous) => !previous)
          }
          aria-label={
            isBotOpen
              ? "Close Workivo Bot"
              : "Open Workivo Bot"
          }
          className={`group fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2.5 rounded-full border border-white/20 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.45)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_42px_rgba(124,58,237,0.65)] active:scale-[0.98] sm:right-6 sm:px-6 ${
            isBotOpen
              ? "shadow-[0_0_38px_rgba(124,58,237,0.55)]"
              : ""
          }`}
        >
          <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 opacity-60 blur-xl transition-opacity duration-300 group-hover:opacity-90" />

          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
            {isBotOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            )}
          </span>

          <span className="relative">
            {isBotOpen
              ? "Close"
              : "Ask Workivo AI"}
          </span>

          {!isBotOpen && (
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          )}
        </button>
      </div>
    </div>
  </div>
);
}
