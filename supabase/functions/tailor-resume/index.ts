import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
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

  return authorization
    .replace("Bearer ", "")
    .trim();
}

function extractTailoredResume(
  payload: unknown
): string {
  let result: any = payload;

  if (Array.isArray(result)) {
    result = result[0];
  }

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

  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      return result;
    }
  }

  if (
    !result ||
    typeof result !== "object"
  ) {
    return "";
  }

  const possibleResume =
    result.tailored_resume ??
    result.tailoredResume ??
    result.resume ??
    result.output ??
    result.text ??
    result.content ??
    result.message ??
    "";

  if (
    typeof possibleResume === "string"
  ) {
    return possibleResume;
  }

  return JSON.stringify(possibleResume);
}

Deno.serve(
  async (request: Request) => {
    /* =====================================================
       CORS
       ===================================================== */

    if (request.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    /* =====================================================
       METHOD
       ===================================================== */

    if (request.method !== "POST") {
      return jsonResponse(
        {
          error: "Method not allowed.",
        },
        405
      );
    }

    try {
      /* ===================================================
         ENVIRONMENT VARIABLES
         =================================================== */

      const supabaseUrl =
        Deno.env.get("SUPABASE_URL");

      const supabaseAnonKey =
        Deno.env.get("SUPABASE_ANON_KEY");

      const makeWebhookUrl =
        Deno.env.get(
          "MAKE_TAILOR_WEBHOOK_URL"
        );

      if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        !makeWebhookUrl
      ) {
        console.error(
          "Missing Tailor AI configuration."
        );

        return jsonResponse(
          {
            error:
              "AI resume writer is not configured yet.",
          },
          500
        );
      }

      /* ===================================================
         AUTHENTICATION
         =================================================== */

      const accessToken =
        getAuthorizationToken(request);

      if (!accessToken) {
        return jsonResponse(
          {
            error:
              "Missing authentication token.",
          },
          401
        );
      }

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

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser(
          accessToken
        );

      if (userError || !user) {
        console.error(
          "TAILOR AUTH ERROR:",
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

      /* ===================================================
         REQUEST BODY
         =================================================== */

      let body: any;

      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          {
            error:
              "Invalid JSON request body.",
          },
          400
        );
      }

      const resumeText =
        typeof body?.resume_text === "string"
          ? body.resume_text.trim()
          : "";

      const jobDescription =
        typeof body?.job_description === "string"
          ? body.job_description.trim()
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

      if (!jobDescription) {
        return jsonResponse(
          {
            error:
              "Job description is required.",
          },
          400
        );
      }

      /* ===================================================
         INPUT LIMITS
         =================================================== */

      const MAX_RESUME_TEXT_LENGTH = 100000;
      const MAX_JOB_DESCRIPTION_LENGTH = 50000;

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

      if (
        jobDescription.length >
        MAX_JOB_DESCRIPTION_LENGTH
      ) {
        return jsonResponse(
          {
            error:
              "Job description is too large to process.",
          },
          413
        );
      }

      console.log(
        `Authenticated tailor request from user: ${user.id}`
      );

      /* ===================================================
         CALL MAKE
         =================================================== */

      const makeResponse =
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
              resume_text: resumeText,

              job_description:
                jobDescription,

              user_id: user.id,

              user_email:
                user.email ?? null,
            }),
          }
        );

      /* ===================================================
         READ MAKE RESPONSE
         =================================================== */

      const makeResponseText =
        await makeResponse.text();

      if (!makeResponse.ok) {
        console.error(
          "MAKE TAILOR ERROR:",
          makeResponse.status,
          makeResponseText
        );

        return jsonResponse(
          {
            error:
              "AI resume writer returned an error.",
          },
          502
        );
      }

      let makePayload: unknown =
        makeResponseText;

      try {
        makePayload =
          JSON.parse(makeResponseText);
      } catch {
        // Plain text response is allowed.
      }

      /* ===================================================
         EXTRACT TAILORED RESUME
         =================================================== */

      const tailoredResume =
        extractTailoredResume(
          makePayload
        );

      if (!tailoredResume.trim()) {
        console.error(
          "INVALID TAILOR RESPONSE:",
          makePayload
        );

        return jsonResponse(
          {
            error:
              "AI resume writer returned an empty result.",
          },
          502
        );
      }

      /* ===================================================
         SUCCESS
         =================================================== */

      return jsonResponse(
        {
          tailored_resume:
            tailoredResume,

          authenticated: true,
        },
        200
      );
    } catch (error) {
      console.error(
        "TAILOR EDGE FUNCTION ERROR:",
        error
      );

      return jsonResponse(
        {
          error:
            "An unexpected error occurred while tailoring the resume.",
        },
        500
      );
    }
  }
);
