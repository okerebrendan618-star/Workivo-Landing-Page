const HIMALAYAS_HOSTS = new Set([
  "himalayas.app",
  "www.himalayas.app",
]);

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const FETCH_TIMEOUT_MS = 12000;

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isHimalayasUrl(value) {
  try {
    const url = new URL(value);
    return HIMALAYAS_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function tokenize(value = "") {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((word) => word.length >= 3)
  );
}

function similarity(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);

  if (!A.size || !B.size) return 0;

  let matches = 0;

  for (const word of A) {
    if (B.has(word)) matches++;
  }

  return matches / Math.max(A.size, B.size);
}

function safeAbsoluteUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function extractHimalayasJobInfo(url) {
  try {
    const parsed = new URL(url);

    const match = parsed.pathname.match(
      /^\/companies\/([^/]+)\/jobs\/([^/]+)\/?$/i
    );

    if (!match) {
      return null;
    }

    const companySlug = decodeURIComponent(match[1]);
    const jobSlug = decodeURIComponent(match[2]);

    const title = jobSlug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return {
      companySlug,
      jobSlug,
      title,
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/*
 * iMERIT
 *
 * iMerit's public careers listing links its project applications
 * into the Scholars application system.
 *
 * We use the exact Himalayas job title + company + location clues
 * rather than guessing a Scholars numeric ID.
 */
async function resolveIMerit({ jobTitle, companySlug, location }) {
  if (companySlug !== "imerit") {
    return null;
  }

  const careersUrl =
    "https://imerit.ai/careers-listing/?hash=flynpTV835474";

  try {
    const response = await fetchWithTimeout(careersUrl, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    /*
     * Find every Scholars URL present on the iMerit careers page.
     */
    const links = [];

    const hrefRegex =
      /href\s*=\s*["']([^"']*app\.scholars\.net\/jobs\/[^"']+)["']/gi;

    let match;

    while ((match = hrefRegex.exec(html)) !== null) {
      const href = decodeHtml(match[1]);

      const absolute = safeAbsoluteUrl(href, careersUrl);

      if (absolute && absolute.includes("app.scholars.net/jobs/")) {
        links.push(absolute);
      }
    }

    /*
     * Remove duplicates.
     */
    const uniqueLinks = [...new Set(links)];

    if (!uniqueLinks.length) {
      return null;
    }

    /*
     * Build a normalized target from the Himalayas listing.
     */
    const targetTitle = normalizeText(jobTitle);

    const targetLocation = normalizeText(location);

    /*
     * Look around each Scholars link in the HTML and score
     * nearby text for title/location similarity.
     */
    const candidates = [];

    for (const link of uniqueLinks) {
      const index = html.indexOf(link);

      const contextStart = Math.max(0, index - 1800);
      const contextEnd = Math.min(html.length, index + 1800);

      const context = normalizeText(
        html.slice(contextStart, contextEnd)
      );

      const titleScore = similarity(context, targetTitle);

      const locationScore =
        targetLocation && context.includes(targetLocation) ? 1 : 0;

      const score =
        titleScore * 0.75 +
        locationScore * 0.25;

      candidates.push({
        applyUrl: link,
        score,
        titleScore,
        locationScore,
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];

    if (!best) {
      return null;
    }

    /*
     * Conservative threshold.
     *
     * We would rather fall back to Himalayas than send someone
     * to the wrong iMerit project.
     */
    if (best.score < 0.55) {
      return null;
    }

    return {
      applyUrl: best.applyUrl,
      resolved: true,
      method: "imerit-scholars",
      confidence: Number(best.score.toFixed(3)),
    };
  } catch (error) {
    console.error("iMerit resolver failed:", error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const originalUrl = req.query?.url;

    if (!originalUrl) {
      return res.status(400).json({
        error: "Missing url parameter",
      });
    }

    if (!isHttpUrl(originalUrl)) {
      return res.status(400).json({
        error: "Invalid URL",
      });
    }

    if (!isHimalayasUrl(originalUrl)) {
      return res.status(400).json({
        error: "Only Himalayas URLs are supported",
      });
    }

    const jobInfo = extractHimalayasJobInfo(originalUrl);

    if (!jobInfo) {
      return res.status(200).json({
        originalUrl,
        applyUrl: originalUrl,
        resolved: false,
        method: "fallback-invalid-job-url",
      });
    }

    /*
     * Try iMerit first.
     */
    const iMeritResult = await resolveIMerit({
      jobTitle: jobInfo.title,
      companySlug: jobInfo.companySlug,
      location: "",
    });

    if (iMeritResult) {
      return res.status(200).json({
        originalUrl,
        finalUrl: iMeritResult.applyUrl,
        applyUrl: iMeritResult.applyUrl,
        resolved: true,
        method: iMeritResult.method,
        confidence: iMeritResult.confidence,
      });
    }

    /*
     * Safe fallback.
     */
    return res.status(200).json({
      originalUrl,
      finalUrl: originalUrl,
      applyUrl: originalUrl,
      resolved: false,
      method: "fallback-no-external-source",
    });
  } catch (error) {
    console.error("resolve-apply error:", error);

    return res.status(500).json({
      error: "Resolver failed",
      message: error?.message || "Unknown error",
    });
  }
}
