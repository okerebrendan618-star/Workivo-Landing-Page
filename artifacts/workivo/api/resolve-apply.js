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
 * ------------------------------------------------------------
 * VERIFIED SOURCE CONFIGURATION
 * ------------------------------------------------------------
 *
 * These are public job-posting sources that can be checked
 * without exposing API keys or credentials.
 *
 * We intentionally DO NOT scrape random websites or blindly
 * trust search-engine results.
 * ------------------------------------------------------------
 */

const ATS_HOSTS = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "apply.workable.com",
  "recruitee.com",
]);

/*
 * ------------------------------------------------------------
 * VERIFIED SCHOLARS SOURCE
 * ------------------------------------------------------------
 *
 * This is intentionally a small verified mapping.
 *
 * It is NOT a fake universal Scholars API.
 *
 * We only use it when the company/title match this exact
 * verified job that we have already confirmed.
 * ------------------------------------------------------------
 */

const VERIFIED_EXTERNAL_JOBS = [
  {
    company: "imerit",
    titlePatterns: [
      "ai response evaluator",
      "ai response evaluation analyst",
      "ai response evaluator analyst",
    ],
    applyUrl: "https://app.scholars.net/jobs/656",
    method: "scholars-verified",
  },
];

/* ============================================================
   BASIC RESPONSE HELPERS
   ============================================================ */

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

/* ============================================================
   STRING NORMALIZATION
   ============================================================ */

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
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value = "") {
  return stripHtml(String(value))
    .toLowerCase()
    .replace(/&[^;\s]+;/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompany(value = "") {
  return normalizeText(value)
    .replace(
      /\b(incorporated|inc|llc|ltd|limited|corp|corporation|company|co)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value = "") {
  return normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTokens(value = "") {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 2 &&
          ![
            "the",
            "and",
            "for",
            "with",
            "from",
            "into",
            "your",
            "our",
            "you",
            "job",
            "role",
          ].includes(token),
      ),
  );
}

function tokenOverlap(a, b) {
  const first = getTokens(a);
  const second = getTokens(b);

  if (!first.size || !second.size) {
    return 0;
  }

  let matches = 0;

  for (const token of first) {
    if (second.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(first.size, second.size);
}

function titleSimilarity(a, b) {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  if (
    first.includes(second) ||
    second.includes(first)
  ) {
    return 0.92;
  }

  return tokenOverlap(first, second);
}

function descriptionSimilarity(candidateDescription, sourceDescription) {
  if (
    !candidateDescription ||
    !sourceDescription
  ) {
    return 0;
  }

  return tokenOverlap(
    candidateDescription,
    sourceDescription,
  );
}

/* ============================================================
   SAFE URL HELPERS
   ============================================================ */

function safeAbsoluteUrl(value, baseUrl) {
  if (!value) {
    return null;
  }

  try {
    const absolute = new URL(
      decodeHtmlEntities(String(value).trim()),
      baseUrl,
    );

    if (!isHttpUrl(absolute.toString())) {
      return null;
    }

    return absolute.toString();
  } catch {
    return null;
  }
}

function hostnameMatches(url, hosts) {
  try {
    const hostname = new URL(url)
      .hostname
      .toLowerCase();

    return hosts.has(hostname);
  } catch {
    return false;
  }
}

/* ============================================================
   FETCH HELPERS
   ============================================================ */

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = FETCH_TIMEOUT_MS,
) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Workivo Apply Resolver/2.0",
          ...(options.headers || {}),
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function fetchText(url, options = {}) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          Accept:
            "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; Workivo Apply Resolver/2.0)",
          ...(options.headers || {}),
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return {
      text: await response.text(),
      finalUrl: response.url || url,
    };
  } catch {
    return null;
  }
}

/* ============================================================
   HIMALAYAS HTML LINK EXTRACTION
   ============================================================ */

function looksLikeApplicationUrl(value) {
  return /apply|application|careers|jobs|job-application|workday|greenhouse|lever|ashby|smartrecruiters|recruitee|workable/i.test(
    value,
  );
}

function looksLikeApplicationText(value) {
  return /apply|application|careers|job|jobs/i.test(
    value,
  );
}

function extractExternalApplyUrl(
  html,
  baseUrl,
) {
  if (!html) {
    return null;
  }

  /*
   * First inspect normal anchor tags.
   */
  const anchorRegex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while (
    (match = anchorRegex.exec(html)) !== null
  ) {
    const rawHref =
      match[1]?.trim();

    const rawText =
      match[2] || "";

    if (!rawHref) {
      continue;
    }

    const linkText = stripHtml(rawText);

    if (!looksLikeApplicationText(linkText)) {
      continue;
    }

    const absoluteUrl =
      safeAbsoluteUrl(
        rawHref,
        baseUrl,
      );

    if (
      absoluteUrl &&
      isExternalHttpUrl(absoluteUrl)
    ) {
      return absoluteUrl;
    }
  }

  /*
   * Then inspect explicit URLs.
   */
  const externalUrlRegex =
    /https?:\/\/[^\s"'<>\\]+/gi;

  const possibleUrls =
    html.match(externalUrlRegex) || [];

  for (
    const rawCandidate of possibleUrls
  ) {
    const candidate =
      decodeHtmlEntities(
        rawCandidate
          .replace(/[),.;]+$/g, "")
          .trim(),
      );

    if (
      !isExternalHttpUrl(candidate)
    ) {
      continue;
    }

    if (
      looksLikeApplicationUrl(candidate)
    ) {
      return candidate;
    }
  }

  /*
   * Finally inspect common ATS domains specifically.
   */
  const platformRegex =
    /https?:\/\/[^\s"'<>\\]*(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|recruitee\.com|workable\.com)[^\s"'<>\\]*/gi;

  const platformMatches =
    html.match(platformRegex) || [];

  for (
    const rawCandidate of platformMatches
  ) {
    const candidate =
      decodeHtmlEntities(
        rawCandidate
          .replace(/[),.;]+$/g, "")
          .trim(),
      );

    if (
      isExternalHttpUrl(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

/* ============================================================
   VERIFIED STATIC SOURCES
   ============================================================ */

function resolveVerifiedExternalJob(
  companyName,
  title,
) {
  const normalizedCompany =
    normalizeCompany(companyName);

  const normalizedTitle =
    normalizeText(title);

  for (
    const source of VERIFIED_EXTERNAL_JOBS
  ) {
    if (
      normalizeCompany(source.company) !==
      normalizedCompany
    ) {
      continue;
    }

    const titleMatches =
      source.titlePatterns.some(
        (pattern) => {
          const normalizedPattern =
            normalizeText(pattern);

          return (
            normalizedTitle ===
              normalizedPattern ||
            normalizedTitle.includes(
              normalizedPattern,
            ) ||
            normalizedPattern.includes(
              normalizedTitle,
            )
          );
        },
      );

    if (titleMatches) {
      return {
        applyUrl: source.applyUrl,
        method: source.method,
        score: 1,
      };
    }
  }

  return null;
}

/* ============================================================
   GREENHOUSE
   ============================================================ */

async function searchGreenhouse(
  companySlug,
  title,
  description,
) {
  const candidates = [
    slugify(companySlug),
  ].filter(Boolean);

  for (
    const boardToken of candidates
  ) {
    const url =
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;

    const data =
      await fetchJson(url);

    if (
      !data ||
      !Array.isArray(data.jobs)
    ) {
      continue;
    }

    let best = null;

    for (
      const job of data.jobs
    ) {
      const sourceTitle =
        job.title || "";

      const titleScore =
        titleSimilarity(
          title,
          sourceTitle,
        );

      if (titleScore < 0.68) {
        continue;
      }

      const sourceDescription =
        job.content || "";

      const descriptionScore =
        descriptionSimilarity(
          description,
          sourceDescription,
        );

      const score =
        titleScore * 0.75 +
        descriptionScore * 0.25;

      if (
        !best ||
        score > best.score
      ) {
        best = {
          score,
          titleScore,
          url:
            job.absolute_url ||
            `https://boards.greenhouse.io/${encodeURIComponent(boardToken)}/jobs/${job.id}`,
          method:
            "greenhouse",
        };
      }
    }

    if (
      best &&
      best.score >= 0.70
    ) {
      return best;
    }
  }

  return null;
}

/* ============================================================
   LEVER
   ============================================================ */

async function searchLever(
  companySlug,
  title,
  description,
) {
  const siteCandidates = [
    slugify(companySlug),
  ].filter(Boolean);

  for (
    const site of siteCandidates
  ) {
    const url =
      `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;

    const data =
      await fetchJson(url);

    if (!Array.isArray(data)) {
      continue;
    }

    let best = null;

    for (
      const job of data
    ) {
      const sourceTitle =
        job.text ||
        job.title ||
        "";

      const titleScore =
        titleSimilarity(
          title,
          sourceTitle,
        );

      if (titleScore < 0.68) {
        continue;
      }

      const sourceDescription =
        job.descriptionPlain ||
        job.description ||
        "";

      const descriptionScore =
        descriptionSimilarity(
          description,
          sourceDescription,
        );

      const score =
        titleScore * 0.75 +
        descriptionScore * 0.25;

      const applyUrl =
        job.applyUrl ||
        job.hostedUrl ||
        job.url;

      if (
        !applyUrl ||
        !isExternalHttpUrl(applyUrl)
      ) {
        continue;
      }

      if (
        !best ||
        score > best.score
      ) {
        best = {
          score,
          titleScore,
          url: applyUrl,
          method: "lever",
        };
      }
    }

    if (
      best &&
      best.score >= 0.70
    ) {
      return best;
    }
  }

  return null;
}

/* ============================================================
   ASHBY
   ============================================================ */

async function searchAshby(
  companySlug,
  title,
  description,
) {
  const boardCandidates = [
    slugify(companySlug),
  ].filter(Boolean);

  for (
    const boardName of boardCandidates
  ) {
    const url =
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardName)}`;

    const data =
      await fetchJson(url);

    if (
      !data ||
      !Array.isArray(data.jobs)
    ) {
      continue;
    }

    let best = null;

    for (
      const job of data.jobs
    ) {
      const sourceTitle =
        job.title || "";

      const titleScore =
        titleSimilarity(
          title,
          sourceTitle,
        );

      if (titleScore < 0.68) {
        continue;
      }

      const sourceDescription =
        job.description ||
        job.descriptionHtml ||
        "";

      const descriptionScore =
        descriptionSimilarity(
          description,
          sourceDescription,
        );

      const score =
        titleScore * 0.75 +
        descriptionScore * 0.25;

      const applyUrl =
        job.applyUrl ||
        job.jobUrl ||
        job.url;

      if (
        !applyUrl ||
        !isExternalHttpUrl(applyUrl)
      ) {
        continue;
      }

      if (
        !best ||
        score > best.score
      ) {
        best = {
          score,
          titleScore,
          url: applyUrl,
          method: "ashby",
        };
      }
    }

    if (
      best &&
      best.score >= 0.70
    ) {
      return best;
    }
  }

  return null;
}

/* ============================================================
   SMARTRECRUITERS
   ============================================================ */

async function searchSmartRecruiters(
  companySlug,
  title,
) {
  const companyCandidates = [
    slugify(companySlug),
  ].filter(Boolean);

  for (
    const companyIdentifier of companyCandidates
  ) {
    const query =
      encodeURIComponent(title);

    const url =
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?q=${query}&limit=100`;

    const data =
      await fetchJson(url);

    if (
      !data ||
      !Array.isArray(data.content)
    ) {
      continue;
    }

    let best = null;

    for (
      const job of data.content
    ) {
      const sourceTitle =
        job.name || "";

      const titleScore =
        titleSimilarity(
          title,
          sourceTitle,
        );

      if (titleScore < 0.72) {
        continue;
      }

      /*
       * SmartRecruiters provides a ref to the detailed
       * posting. Fetch it so we can obtain applyUrl.
       */
      let details = null;

      if (job.ref) {
        details =
          await fetchJson(job.ref);
      }

      const applyUrl =
        details?.applyUrl ||
        details?.postingUrl ||
        job.ref;

      if (
        !applyUrl ||
        !isExternalHttpUrl(applyUrl)
      ) {
        continue;
      }

      if (
        !best ||
        titleScore > best.score
      ) {
        best = {
          score: titleScore,
          titleScore,
          url: applyUrl,
          method:
            "smartrecruiters",
        };
      }
    }

    if (
      best &&
      best.score >= 0.72
    ) {
      return best;
    }
  }

  return null;
}

/* ============================================================
   RECRUITEE
   ============================================================ */

async function searchRecruitee(
  companySlug,
  title,
  description,
) {
  const slugCandidates = [
    slugify(companySlug),
  ].filter(Boolean);

  for (
    const company of slugCandidates
  ) {
    const apiUrl =
      `https://${encodeURIComponent(company)}.recruitee.com/api/offers/`;

    const data =
      await fetchJson(apiUrl);

    if (
      !data ||
      !Array.isArray(data.offers)
    ) {
      continue;
    }

    let best = null;

    for (
      const job of data.offers
    ) {
      const sourceTitle =
        job.title || "";

      const titleScore =
        titleSimilarity(
          title,
          sourceTitle,
        );

      if (titleScore < 0.68) {
        continue;
      }

      const sourceDescription =
        job.description ||
        job.description_html ||
        "";

      const descriptionScore =
        descriptionSimilarity(
          description,
          sourceDescription,
        );

      const score =
        titleScore * 0.75 +
        descriptionScore * 0.25;

      const applyUrl =
        job.careers_url ||
        job.url ||
        job.apply_url;

      if (
        !applyUrl ||
        !isExternalHttpUrl(applyUrl)
      ) {
        continue;
      }

      if (
        !best ||
        score > best.score
      ) {
        best = {
          score,
          titleScore,
          url: applyUrl,
          method: "recruitee",
        };
      }
    }

    if (
      best &&
      best.score >= 0.70
    ) {
      return best;
    }
  }

  return null;
}

/* ============================================================
   WORKABLE
   ============================================================ */

function extractWorkableJobs(
  html,
  baseUrl,
) {
  const results = [];

  if (!html) {
    return results;
  }

  const anchorRegex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while (
    (match = anchorRegex.exec(html)) !== null
  ) {
    const href =
      safeAbsoluteUrl(
        match[1],
        baseUrl,
      );

    const text =
      stripHtml(match[2]);

    if (!href || !text) {
      continue;
    }

    if (
      /\/j\/|\/jobs\/|job/i.test(
        href,
      )
    ) {
      results.push({
        url: href,
        title: text,
      });
    }
  }

  return results;
}

async function searchWorkable(
  companySlug,
  title,
) {
  const companyCandidates = [
    slugify(companySlug),
  ].filter(Boolean);

  for (
    const company of companyCandidates
  ) {
    const url =
      `https://apply.workable.com/${encodeURIComponent(company)}/`;

    const result =
      await fetchText(url);

    if (!result) {
      continue;
    }

    const jobs =
      extractWorkableJobs(
        result.text,
        result.finalUrl || url,
      );

    let best = null;

    for (
      const job of jobs
    ) {
      const score =
        titleSimilarity(
          title,
          job.title,
        );

      if (
        score < 0.72
      ) {
        continue;
      }

      if (
        !best ||
        score > best.score
      ) {
        best = {
          score,
          titleScore: score,
          url: job.url,
          method: "workable",
        };
      }
    }

    if (
      best &&
      best.score >= 0.72
    ) {
      return best;
    }
  }

  return null;
}

/* ============================================================
   PROVIDER SEARCH
   ============================================================ */

async function discoverExternalApplication({
  companyName,
  companySlug,
  title,
  description,
}) {
  /*
   * 1. First check manually verified sources.
   *
   * This is the highest-confidence path.
   */
  const verified =
    resolveVerifiedExternalJob(
      companyName,
      title,
    );

  if (verified) {
    return verified;
  }

  /*
   * 2. Query public ATS/job-board sources.
   *
   * We run these independently so one provider failing does
   * not break the entire resolver.
   */
  const results =
    await Promise.allSettled([
      searchGreenhouse(
        companySlug,
        title,
        description,
      ),

      searchLever(
        companySlug,
        title,
        description,
      ),

      searchAshby(
        companySlug,
        title,
        description,
      ),

      searchSmartRecruiters(
        companySlug,
        title,
      ),

      searchRecruitee(
        companySlug,
        title,
        description,
      ),

      searchWorkable(
        companySlug,
        title,
      ),
    ]);

  const successful =
    results
      .filter(
        (result) =>
          result.status ===
            "fulfilled" &&
          result.value,
      )
      .map(
        (result) =>
          result.value,
      );

  if (!successful.length) {
    return null;
  }

  /*
   * Choose the strongest verified provider match.
   */
  successful.sort(
    (a, b) =>
      Number(b.score || 0) -
      Number(a.score || 0),
  );

  const best =
    successful[0];

  /*
   * Conservative threshold.
   *
   * We would rather fall back to Himalayas than send a user
   * to the wrong company's job.
   */
  if (
    Number(best.score || 0) < 0.70
  ) {
    return null;
  }

  return best;
}

/* ============================================================
   HIMALAYAS JOB DATA
   ============================================================ */

async function fetchHimalayasJob(
  originalUrl,
) {
  /*
   * First use the public Himalayas API search endpoint.
   *
   * The exact job URL is passed as the query so we can retrieve
   * the job's structured fields instead of depending only on
   * rendered HTML.
   */
  const apiUrl =
    `https://himalayas.app/jobs/api/search?page=1&q=${encodeURIComponent(originalUrl)}`;

  const data =
    await fetchJson(apiUrl);

  if (
    data &&
    Array.isArray(data.jobs) &&
    data.jobs.length
  ) {
    /*
     * Prefer an exact guid/applicationLink match.
     */
    const exact =
      data.jobs.find(
        (job) =>
          job?.guid === originalUrl ||
          job?.applicationLink === originalUrl,
      );

    const job =
      exact || data.jobs[0];

    return {
      title:
        typeof job.title === "string"
          ? job.title
          : "",

      companyName:
        typeof job.companyName === "string"
          ? job.companyName
          : "",

      companySlug:
        typeof job.companySlug === "string"
          ? job.companySlug
          : "",

      description:
        typeof job.description === "string"
          ? job.description
          : "",

      locationRestrictions:
        Array.isArray(
          job.locationRestrictions,
        )
          ? job.locationRestrictions
          : [],

      applicationLink:
        typeof job.applicationLink ===
        "string"
          ? job.applicationLink
          : originalUrl,
    };
  }

  return null;
}

/* ============================================================
   MAIN REQUEST HANDLER
   ============================================================ */

export default {
  async fetch(request) {
    /*
     * --------------------------------------------------------
     * CORS PREFLIGHT
     * --------------------------------------------------------
     */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: JSON_HEADERS,
      });
    }

    /*
     * --------------------------------------------------------
     * ONLY GET
     * --------------------------------------------------------
     */
    if (request.method !== "GET") {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405,
      );
    }

    const requestUrl =
      new URL(request.url);

    const rawUrl =
      requestUrl.searchParams.get(
        "url",
      );

    /*
     * --------------------------------------------------------
     * REQUIRE URL
     * --------------------------------------------------------
     */
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

    let jobUrl;

    try {
      jobUrl = new URL(rawUrl);
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
     * The endpoint only accepts Himalayas URLs.
     *
     * This prevents someone from turning the endpoint into a
     * generic server-side URL fetcher.
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

    const originalUrl =
      jobUrl.toString();

    try {
      /*
       * ------------------------------------------------------
       * STEP 1 — DIRECT HIMALAYAS PAGE FETCH
       * ------------------------------------------------------
       */
      const pageResult =
        await fetchText(
          originalUrl,
        );

      /*
       * ------------------------------------------------------
       * STEP 2 — REDIRECT CHECK
       *
       * Sometimes the employer URL may already be the final
       * destination.
       * ------------------------------------------------------
       */
      if (pageResult) {
        const finalUrl =
          pageResult.finalUrl ||
          originalUrl;

        if (
          isExternalHttpUrl(
            finalUrl,
          )
        ) {
          return jsonResponse({
            originalUrl,
            finalUrl,
            applyUrl: finalUrl,
            resolved: true,
            method:
              "redirect",
          });
        }

        /*
         * ----------------------------------------------------
         * STEP 3 — OLD HTML EXTRACTION
         *
         * Keep the original resolver behavior as a fallback
         * because some future Himalayas jobs may contain a
         * direct employer link in their HTML.
         * ----------------------------------------------------
         */
        const htmlApplyUrl =
          extractExternalApplyUrl(
            pageResult.text,
            finalUrl,
          );

        if (htmlApplyUrl) {
          return jsonResponse({
            originalUrl,
            finalUrl,
            applyUrl:
              htmlApplyUrl,
            resolved: true,
            method:
              "html-link",
          });
        }
      }

      /*
       * ------------------------------------------------------
       * STEP 4 — STRUCTURED HIMALAYAS JOB DATA
       * ------------------------------------------------------
       */
      const job =
        await fetchHimalayasJob(
          originalUrl,
        );

      /*
       * If structured data isn't available, we safely fall
       * back rather than guessing.
       */
      if (!job) {
        return jsonResponse({
          originalUrl,
          finalUrl:
            pageResult?.finalUrl ||
            originalUrl,
          applyUrl: originalUrl,
          resolved: false,
          method:
            "fallback-no-job-data",
        });
      }

      /*
       * ------------------------------------------------------
       * STEP 5 — VERIFIED EXTERNAL DISCOVERY
       * ------------------------------------------------------
       */
      const external =
        await discoverExternalApplication({
          companyName:
            job.companyName,

          companySlug:
            job.companySlug,

          title:
            job.title,

          description:
            job.description,
        });

      /*
       * ------------------------------------------------------
       * STEP 6 — CONFIDENT EXTERNAL MATCH
       * ------------------------------------------------------
       */
      if (
        external &&
        external.url &&
        isExternalHttpUrl(
          external.url,
        )
      ) {
        return jsonResponse({
          originalUrl,

          finalUrl:
            pageResult?.finalUrl ||
            originalUrl,

          applyUrl:
            external.url,

          resolved: true,

          method:
            external.method ||
            "external-provider",

          providerScore:
            Number(
              external.score || 0,
            ),
        });
      }

      /*
       * ------------------------------------------------------
       * STEP 7 — SAFE FALLBACK
       * ------------------------------------------------------
       *
       * We NEVER guess.
       *
       * If no trusted source is found, the user goes to the
       * original Himalayas job.
       * ------------------------------------------------------
       */
      return jsonResponse({
        originalUrl,

        finalUrl:
          pageResult?.finalUrl ||
          originalUrl,

        applyUrl: originalUrl,

        resolved: false,

        method:
          "fallback",
      });
    } catch (error) {
      /*
       * ------------------------------------------------------
       * FINAL FAILSAFE
       * ------------------------------------------------------
       *
       * Apply should never completely break because the
       * resolver experienced an error.
       * ------------------------------------------------------
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
