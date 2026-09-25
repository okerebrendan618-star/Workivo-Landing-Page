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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isHimalayasUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return HIMALAYAS_HOSTS.has(
      parsed.hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function looksLikeApplicationUrl(value: string): boolean {
  return /apply|application|careers|jobs|job-application|workday|greenhouse|lever|ashby|smartrecruiters|recruitee/i.test(
    value,
  );
}

function looksLikeApplicationText(value: string): boolean {
  return /apply|application|careers|job|jobs/i.test(value);
}

function extractExternalApplyUrl(
  html: string,
  baseUrl: string,
): string | null {
  /*
   * First, look for normal HTML links.
   *
   * Example:
   * <a href="https://company.com/careers/job-123">
   *   Apply Now
   * </a>
   */
  const anchorRegex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim();
    const rawText = match[2] ?? "";

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
   * Some job pages expose the application URL in attributes
   * such as href, data-url, data-href, or JSON embedded in HTML.
   *
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
   * Look for common application platforms even if the URL
   * itself doesn't contain the word "apply".
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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: JSON_HEADERS,
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawUrl =
    requestUrl.searchParams.get("url");

  /*
   * Make sure the frontend actually supplied a job URL.
   */
  if (!rawUrl || !rawUrl.trim()) {
    return jsonResponse(
      {
        error: "Missing job URL.",
      },
      400,
    );
  }

  let jobUrl: URL;

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
   * This resolver only accepts Himalayas job URLs.
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
    /*
     * Fetch the Himalayas job page from Vercel's server,
     * not from the user's browser.
     */
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    let response: Response;

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
     * Vercel's fetch follows redirects automatically.
     *
     * If Himalayas itself redirects directly to an employer
     * application page, we can use that final URL immediately.
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
     * Read the actual Himalayas HTML page.
     */
    const html = await response.text();

    /*
     * Search the page for an external employer/application
     * link.
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
     * If nothing external was found, safely fall back to
     * the original Himalayas application URL.
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
     * Never break the user's Apply button completely.
     * If the resolver fails, the user still gets the
     * original Himalayas job page.
     */
    return jsonResponse({
      originalUrl,
      finalUrl: originalUrl,
      applyUrl: originalUrl,
      resolved: false,
      method: "fallback",
    });
  }
}
