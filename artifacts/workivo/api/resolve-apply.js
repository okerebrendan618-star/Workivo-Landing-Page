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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

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

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function looksLikeApplicationUrl(value) {
  return /apply|application|careers|jobs|job-application|workday|greenhouse|lever|ashby|smartrecruiters|recruitee/i.test(
    value,
  );
}

function looksLikeApplicationText(value) {
  return /apply|application|careers|job|jobs/i.test(
    value,
  );
}

function extractExternalApplyUrl(html, baseUrl) {
  /*
   * Look for normal HTML links whose text suggests
   * that they are application/career links.
   */
  const anchorRegex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim();
    const rawText = match[2] || "";

    if (!rawHref) {
      continue;
    }

    const linkText = rawText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!looksLikeApplicationText(linkText)) {
      continue;
    }

    try {
      const absoluteUrl = new URL(
        decodeHtmlEntities(rawHref),
        baseUrl,
      );

      if (
        isHttpUrl(absoluteUrl.toString()) &&
        !HIMALAYAS_HOSTS.has(
          absoluteUrl.hostname.toLowerCase(),
        )
      ) {
        return absoluteUrl.toString();
      }
    } catch {
      // Ignore malformed URLs.
    }
  }

  /*
   * Look for external URLs containing common application
   * keywords.
   */
  const externalUrlRegex =
    /https?:\/\/[^\s"'<>\\]+/gi;

  const possibleUrls =
    html.match(externalUrlRegex) || [];

  for (const rawCandidate of possibleUrls) {
    const candidate = decodeHtmlEntities(
      rawCandidate
        .replace(/[),.;]+$/g, "")
        .trim(),
    );

    if (!isHttpUrl(candidate)) {
      continue;
    }

    try {
      const parsed = new URL(candidate);

      if (
        HIMALAYAS_HOSTS.has(
          parsed.hostname.toLowerCase(),
        )
      ) {
        continue;
      }

      if (looksLikeApplicationUrl(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore malformed URLs.
    }
  }

  /*
   * Look specifically for common ATS platforms.
   */
  const platformRegex =
    /https?:\/\/[^\s"'<>\\]*(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|recruitee\.com)[^\s"'<>\\]*/gi;

  const platformMatches =
    html.match(platformRegex) || [];

  for (const rawCandidate of platformMatches) {
    const candidate = decodeHtmlEntities(
      rawCandidate
        .replace(/[),.;]+$/g, "")
        .trim(),
    );

    if (!isHttpUrl(candidate)) {
      continue;
    }

    try {
      const parsed = new URL(candidate);

      if (
        !HIMALAYAS_HOSTS.has(
          parsed.hostname.toLowerCase(),
        )
      ) {
        return candidate;
      }
    } catch {
      // Ignore malformed URLs.
    }
  }

  return null;
}

export default {
  async fetch(request) {
    /*
     * Allow browser preflight requests.
     */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: JSON_HEADERS,
      });
    }

    /*
     * Only GET is needed.
     */
    if (request.method !== "GET") {
      return jsonResponse(
        {
          error: "Method not allowed.",
        },
        405,
      );
    }

    const requestUrl = new URL(request.url);
    const rawUrl =
      requestUrl.searchParams.get("url");

    /*
     * Make sure a job URL was supplied.
     */
    if (!rawUrl || !rawUrl.trim()) {
      return jsonResponse(
        {
          error: "Missing job URL.",
        },
        400,
      );
    }

    let jobUrl;

    try {
      jobUrl = new URL(rawUrl);
    } catch {
      return jsonResponse(
        {
          error: "Invalid job URL.",
        },
        400,
      );
    }

    /*
     * Security:
     * Only allow Himalayas URLs into this resolver.
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

    const originalUrl = jobUrl.toString();

    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000);

      let response;

      try {
        response = await fetch(originalUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "User-Agent":
              "Mozilla/5.0 (compatible; Workivo Apply Resolver/1.0)",
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      /*
       * If Himalayas redirects directly to an employer
       * application page, use the final URL.
       */
      const finalUrl =
        response.url || originalUrl;

      if (
        isHttpUrl(finalUrl) &&
        !isHimalayasUrl(finalUrl)
      ) {
        return jsonResponse({
          originalUrl,
          finalUrl,
          applyUrl: finalUrl,
          resolved: true,
          method: "redirect",
        });
      }

      /*
       * Read the Himalayas page.
       */
      const html = await response.text();

      /*
       * Search the HTML for an external employer/
       * application URL.
       */
      const externalApplyUrl =
        extractExternalApplyUrl(
          html,
          finalUrl,
        );

      if (externalApplyUrl) {
        return jsonResponse({
          originalUrl,
          finalUrl,
          applyUrl: externalApplyUrl,
          resolved: true,
          method: "html-link",
        });
      }

      /*
       * Nothing external was found.
       * Safely fall back to Himalayas.
       */
      return jsonResponse({
        originalUrl,
        finalUrl,
        applyUrl: originalUrl,
        resolved: false,
        method: "fallback",
      });
    } catch (error) {
      console.error(
        "Workivo apply resolver failed:",
        error,
      );

      /*
       * Never completely break the Apply button.
       */
      return jsonResponse({
        originalUrl,
        finalUrl: originalUrl,
        applyUrl: originalUrl,
        resolved: false,
        method: "fallback",
      });
    }
  },
};
