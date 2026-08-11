import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* =========================================================
   CANONICAL ATS JOB DESCRIPTION
   IMPORTANT:
   This value belongs on the server.
   The frontend does NOT control it.
   ========================================================= */

const CANONICAL_ATS_JOB_DESCRIPTION =
  "Software developer role requiring skills and experience.";

/* =========================================================
   HELPERS
   ========================================================= */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

function getAuthorizationToken(
  request: Request
): string | null {
  const authorization =
    request.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace(
    "Bearer ",
    ""
  ).trim();
}

/* =========================================================
   MAKE RESPONSE NORMALIZATION
   ========================================================= */

function extractMakeResult(
  payload: unknown
): {
  ats_score: number | null;
  feedback: string;
} {
  let result: any = payload;

  /*
   * Sometimes webhook/automation systems return
   * an array containing the actual result.
   */

  if (Array.isArray(result)) {
    result = result[0];
  }

  /*
   * Sometimes the useful response is nested.
   */

  if (
    result &&
    typeof result === "object"
  ) {
    if (
      result.data &&
      typeof result.data === "object"
    ) {
      result = result.data;
    }

    if (
      result.result &&
      typeof result.result === "object"
    ) {
      result = result.result;
    }

    if (
      result.output &&
      typeof result.output === "object"
    ) {
      result = result.output;
    }
  }

  if (
    typeof result === "string"
  ) {
    try {
      result = JSON.parse(result);
    } catch {
      return {
        ats_score: null,
        feedback: result,
      };
    }
  }

  if (
    !result ||
    typeof result !== "object"
  ) {
    return {
      ats_score: null,
      feedback: "",
    };
  }

  /*
   * Accept common score field names.
   */

  const possibleScore =
    result.ats_score ??
    result.atsScore ??
    result.score ??
    result.ATSScore;

  let score: number | null = null;

  if (
    typeof possibleScore === "number"
  ) {
    score = possibleScore;
  }

  if (
    typeof possibleScore === "string"
  ) {
    const parsed = Number(
      possibleScore
        .replace("%", "")
        .trim()
    );

    if (Number.isFinite(parsed)) {
      score = parsed;
    }
  }

  /*
   * Accept common feedback field names.
   */

  const possibleFeedback =
    result.feedback ??
    result.ai_feedback ??
    result.aiFeedback ??
    result.analysis ??
    result.message ??
    "";

  const feedback =
    typeof possibleFeedback === "string"
      ? possibleFeedback
      : JSON.stringify(
          possibleFeedback
        );

  return {
    ats_score: score,
    feedback,
  };
}

/* =========================================================
   EDGE FUNCTION
   ========================================================= */

Deno.serve(async (request: Request) => {
  /* -------------------------------------------------------
     CORS PREFLIGHT
     ------------------------------------------------------- */

  if (request.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }

  /* -------------------------------------------------------
     ONLY POST IS ALLOWED
     ------------------------------------------------------- */

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  try {
    /* =====================================================
       ENVIRONMENT VARIABLES
       ===================================================== */

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const supabaseAnonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      );

    const makeWebhookUrl =
      Deno.env.get(
        "MAKE_ATS_WEBHOOK_URL"
      );

    if (!supabaseUrl) {
      console.error(
        "Missing SUPABASE_URL secret."
      );

      return jsonResponse(
        {
          error:
            "Server configuration error.",
        },
        500
      );
    }

    if (!supabaseAnonKey) {
      console.error(
        "Missing SUPABASE_ANON_KEY secret."
      );

      return jsonResponse(
        {
          error:
            "Server configuration error.",
        },
        500
      );
    }

    if (!makeWebhookUrl) {
      console.error(
        "Missing MAKE_ATS_WEBHOOK_URL secret."
      );

      return jsonResponse(
        {
          error:
            "ATS service is not configured yet.",
        },
        500
      );
    }

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    const accessToken =
      getAuthorizationToken(
        request
      );

    if (!accessToken) {
      return jsonResponse(
        {
          error:
            "Missing authentication token.",
        },
        401
      );
    }

    /*
     * Create a Supabase client using the user's
     * Authorization token.
     */

    const supabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        }
      );

    /* -----------------------------------------------------
       VERIFY USER
       ----------------------------------------------------- */

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "AUTH VERIFICATION FAILED:",
        userError
      );

      return jsonResponse(
        {
          error:
            "Unauthorized. Please login again.",
        },
        401
      );
    }

    console.log(
      `Authenticated ATS request from user: ${user.id}`
    );

    /* =====================================================
       READ REQUEST BODY
       ===================================================== */

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON request body.",
        },
        400
      );
    }

    /* =====================================================
       RESUME TEXT
       ===================================================== */

    const resumeText =
      typeof body?.resume_text ===
      "string"
        ? body.resume_text.trim()
        : "";

    if (!resumeText) {
      return jsonResponse(
        {
          error:
            "Resume text is required.",
        },
        400
      );
    }

    /*
     * Prevent accidentally sending an absurdly large
     * request to the external AI automation.
     *
     * This is text validation, NOT PDF file-size validation.
     */

    const MAX_RESUME_TEXT_LENGTH =
      100000;

    if (
      resumeText.length >
      MAX_RESUME_TEXT_LENGTH
    ) {
      return jsonResponse(
        {
          error:
            "Resume text is too large to process.",
        },
        413
      );
    }

    /* =====================================================
       IMPORTANT SECURITY RULE
       =====================================================

       We intentionally DO NOT use:

       body.job_description

       The frontend may send one, but it is ignored.

       The canonical job description comes from this
       Edge Function.
       ===================================================== */

    const jobDescription =
      CANONICAL_ATS_JOB_DESCRIPTION;

    /* =====================================================
       MAKE WEBHOOK REQUEST
       ===================================================== */

    let makeResponse: Response;

    try {
      makeResponse =
        await fetch(
          makeWebhookUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              resume_text:
                resumeText,

              job_description:
                jobDescription,

              /*
               * Useful metadata for your Make scenario.
               */

              user_id:
                user.id,

              user_email:
                user.email ?? null,
            }),
          }
        );
    } catch (makeNetworkError) {
      console.error(
        "MAKE NETWORK ERROR:",
        makeNetworkError
      );

      return jsonResponse(
        {
          error:
            "Unable to connect to the ATS service.",
        },
        502
      );
    }

    /* =====================================================
       MAKE HTTP STATUS VALIDATION
       ===================================================== */

    const makeResponseText =
      await makeResponse.text();

    if (!makeResponse.ok) {
      console.error(
        "MAKE HTTP ERROR:",
        makeResponse.status,
        makeResponseText
      );

      return jsonResponse(
        {
          error:
            "ATS service returned an error.",
        },
        502
      );
    }

    /* =====================================================
       PARSE MAKE RESPONSE
       ===================================================== */

    let makePayload: unknown =
      makeResponseText;

    try {
      makePayload =
        JSON.parse(
          makeResponseText
        );
    } catch {
      /*
       * It may be plain text.
       * extractMakeResult() handles that.
       */
    }

    /* =====================================================
       VALIDATE ATS RESULT
       ===================================================== */

    const {
      ats_score,
      feedback,
    } =
      extractMakeResult(
        makePayload
      );

    if (
      ats_score === null ||
      !Number.isFinite(
        ats_score
      )
    ) {
      console.error(
        "INVALID MAKE ATS RESPONSE:",
        makePayload
      );

      return jsonResponse(
        {
          error:
            "ATS service returned an invalid score.",
        },
        502
      );
    }

    /* =====================================================
       NORMALIZE SCORE
       ===================================================== */

    const normalizedScore =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ats_score
          )
        )
      );

    /* =====================================================
       SUCCESS
       ===================================================== */

    return jsonResponse(
      {
        ats_score:
          normalizedScore,

        feedback:
          feedback ||
          "Your resume was analyzed successfully.",

        authenticated:
          true,
      },
      200
    );
  } catch (error) {
    /* =====================================================
       GLOBAL ERROR HANDLER
       ===================================================== */

    console.error(
      "ATS EDGE FUNCTION ERROR:",
      error
    );

    return jsonResponse(
      {
        error:
          "An unexpected error occurred while processing the ATS scan.",
      },
      500
    );
  }
});
