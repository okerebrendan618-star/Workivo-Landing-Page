const HIMALAYAS_HOSTS = new Set([
  "himalayas.app",
  "www.himalayas.app",
]);

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const FETCH_TIMEOUT_MS = 7000;

/*
 * ============================================================
 * RESPONSE HELPERS
 * ============================================================
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

/*
 * ============================================================
 * URL VALIDATION
 * ============================================================
 */

function isHttpUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isHimalayasUrl(value) {
  try {
    const url = new URL(value);

    return HIMALAYAS_HOSTS.has(
      url.hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}

function isExternalHttpUrl(value) {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const hostname = new URL(value)
      .hostname
      .toLowerCase();

    return !HIMALAYAS_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/*
 * ============================================================
 * HTML HELPERS
 * ============================================================
 */

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/");
}

function stripHtml(value = "") {
  return decodeHtmlEntities(String(value))
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " ",
    )
    .replace(
      /<[^>]+>/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ============================================================
 * FETCH WITH TIMEOUT
 * ============================================================
 */

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = FETCH_TIMEOUT_MS,
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal:
        controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPage(url) {
  try {
    const response =
      await fetchWithTimeout(
        url,
        {
          method: "GET",

          redirect: "follow",

          headers: {
            Accept:
              "text/html,application/xhtml+xml",

            "User-Agent":
              "Mozilla/5.0 (compatible; Workivo Apply Resolver/3.0)",
          },
        },
      );

    if (!response.ok) {
      return null;
    }

    return {
      text:
        await response.text(),

      finalUrl:
        response.url || url,

      status:
        response.status,
    };
  } catch {
    return null;
  }
}

/*
 * ============================================================
 * SAFE ABSOLUTE URL
 * ============================================================
 */

function safeAbsoluteUrl(
  value,
  baseUrl,
) {
  if (!value) {
    return null;
  }

  try {
    const absolute =
      new URL(
        decodeHtmlEntities(
          String(value).trim(),
        ),
        baseUrl,
      );

    if (
      !isHttpUrl(
        absolute.toString(),
      )
    ) {
      return null;
    }

    return absolute.toString();
  } catch {
    return null;
  }
}

/*
 * ============================================================
 * APPLICATION URL DETECTION
 * ============================================================
 *
 * We are NOT guessing the employer.
 *
 * We only inspect the actual Himalayas page that the user
 * is trying to apply through.
 * ============================================================
 */

function looksLikeApplicationUrl(
  value,
) {
  return /apply|application|careers|jobs|job-application|workday|greenhouse|lever|ashby|smartrecruiters|recruitee|workable/i.test(
    value,
  );
}

function looksLikeApplicationText(
  value,
) {
  return /apply|application|careers/i.test(
    value,
  );
}

/*
 * ============================================================
 * EXTRACT EXTERNAL APPLICATION LINK
 * ============================================================
 */

function extractExternalApplyUrl(
  html,
  baseUrl,
) {
  if (!html) {
    return null;
  }

  /*
   * ----------------------------------------------------------
   * 1. Inspect normal anchor tags.
   * ----------------------------------------------------------
   */

  const anchorRegex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while (
    (match =
      anchorRegex.exec(html)) !==
    null
  ) {
    const rawHref =
      match[1]?.trim();

    const rawText =
      match[2] || "";

    if (!rawHref) {
      continue;
    }

    const linkText =
      stripHtml(rawText);

    if (
      !looksLikeApplicationText(
        linkText,
      )
    ) {
      continue;
    }

    const absoluteUrl =
      safeAbsoluteUrl(
        rawHref,
        baseUrl,
      );

    if (
      absoluteUrl &&
      isExternalHttpUrl(
        absoluteUrl,
      )
    ) {
      return absoluteUrl;
    }
  }

  /*
   * ----------------------------------------------------------
   * 2. Look for explicit external URLs.
   * ----------------------------------------------------------
   */

  const externalUrlRegex =
    /https?:\/\/[^\s"'<>\\]+/gi;

  const possibleUrls =
    html.match(
      externalUrlRegex,
    ) || [];

  for (
    const rawCandidate of possibleUrls
  ) {
    const candidate =
      decodeHtmlEntities(
        rawCandidate
          .replace(
            /[),.;]+$/g,
            "",
          )
          .trim(),
      );

    if (
      !isExternalHttpUrl(
        candidate,
      )
    ) {
      continue;
    }

    if (
      looksLikeApplicationUrl(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  /*
   * ----------------------------------------------------------
   * 3. Look specifically for common ATS/application hosts.
   * ----------------------------------------------------------
   *
   * This does NOT search those platforms.
   *
   * It only recognizes a URL if that URL is actually present
   * in the Himalayas page we fetched.
   * ----------------------------------------------------------
   */

  const platformRegex =
    /https?:\/\/[^\s"'<>\\]*(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|recruitee\.com|workable\.com)[^\s"'<>\\]*/gi;

  const platformMatches =
    html.match(
      platformRegex,
    ) || [];

  for (
    const rawCandidate of platformMatches
  ) {
    const candidate =
      decodeHtmlEntities(
        rawCandidate
          .replace(
            /[),.;]+$/g,
            "",
          )
          .trim(),
      );

    if (
      isExternalHttpUrl(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  return null;
}

/*
 * ============================================================
 * MAIN HANDLER
 * ============================================================
 */

export default {
  async fetch(request) {
    /*
     * --------------------------------------------------------
     * CORS PREFLIGHT
     * --------------------------------------------------------
     */

    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(null, {
        status: 204,
        headers:
          JSON_HEADERS,
      });
    }

    /*
     * --------------------------------------------------------
     * ONLY GET
     * --------------------------------------------------------
     */

    if (
      request.method !==
      "GET"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405,
      );
    }

    const requestUrl =
      new URL(
        request.url,
      );

    /*
     * --------------------------------------------------------
     * GET THE EXACT URL SENT BY JOB MATCHING
     * --------------------------------------------------------
     */

    const rawUrl =
      requestUrl.searchParams.get(
        "url",
      );

    if (
      !rawUrl ||
      !rawUrl.trim()
    ) {
      return jsonResponse(
        {
          error:
            "Missing job URL.",
        },
        400,
      );
    }

    /*
     * --------------------------------------------------------
     * PARSE URL
     * --------------------------------------------------------
     */

    let jobUrl;

    try {
      jobUrl =
        new URL(rawUrl);
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid job URL.",
        },
        400,
      );
    }

    /*
     * --------------------------------------------------------
     * SECURITY
     *
     * Workivo only accepts Himalayas URLs.
     *
     * This prevents the endpoint from becoming a generic
     * server-side URL proxy.
     * --------------------------------------------------------
     */

    if (
      !HIMALAYAS_HOSTS.has(
        jobUrl.hostname.toLowerCase(),
      )
    ) {
      return jsonResponse(
        {
          error:
            "Only Himalayas job URLs can be resolved.",
        },
        400,
      );
    }

    /*
     * This is the EXACT URL supplied by Job Matching.
     */

    const originalUrl =
      jobUrl.toString();

    try {
      /*
       * ======================================================
       * STEP 1
       *
       * Fetch the exact Himalayas URL.
       *
       * We allow normal HTTP redirects to happen.
       * ======================================================
       */

      const page =
        await fetchPage(
          originalUrl,
        );

      /*
       * ======================================================
       * STEP 2
       *
       * If the URL itself redirects to another website,
       * that external URL is the answer.
       * ======================================================
       */

      if (page) {
        const finalUrl =
          page.finalUrl ||
          originalUrl;

        if (
          isExternalHttpUrl(
            finalUrl,
          )
        ) {
          return jsonResponse({
            originalUrl,

            finalUrl,

            applyUrl:
              finalUrl,

            resolved: true,

            method:
              "direct-redirect",
          });
        }

        /*
         * ====================================================
         * STEP 3
         *
         * Inspect the actual Himalayas HTML for an external
         * application link.
         *
         * IMPORTANT:
         *
         * We are NOT searching Google.
         * We are NOT searching iMerit.
         * We are NOT guessing Greenhouse/Lever/etc.
         *
         * We only accept an external URL if the actual job
         * page contains it.
         * ====================================================
         */

        const externalApplyUrl =
          extractExternalApplyUrl(
            page.text,
            finalUrl,
          );

        if (
          externalApplyUrl
        ) {
          return jsonResponse({
            originalUrl,

            finalUrl,

            applyUrl:
              externalApplyUrl,

            resolved: true,

            method:
              "job-page-link",
          });
        }

        /*
         * ====================================================
         * STEP 4
         *
         * No external destination was exposed in the HTML.
         *
         * Safely fall back to the exact URL that Job Matching
         * originally gave us.
         * ====================================================
         */

        return jsonResponse({
          originalUrl,

          finalUrl,

          applyUrl:
            originalUrl,

          resolved: false,

          method:
            "himalayas-direct",
        });
      }

      /*
       * ======================================================
       * STEP 5
       *
       * If the page could not be fetched, do NOT guess.
       *
       * Give the user the original Job Matching URL.
       * ======================================================
       */

      return jsonResponse({
        originalUrl,

        finalUrl:
          originalUrl,

        applyUrl:
          originalUrl,

        resolved: false,

        method:
          "fallback-fetch-failed",
      });
    } catch (error) {
      /*
       * ======================================================
       * FINAL FAILSAFE
       * ======================================================
       */

      console.error(
        "WORKIVO APPLY RESOLVER ERROR:",
        error,
      );

      return jsonResponse({
        originalUrl,

        finalUrl:
          originalUrl,

        applyUrl:
          originalUrl,

        resolved: false,

        method:
          "fallback-error",
      });
    }
  },
};
