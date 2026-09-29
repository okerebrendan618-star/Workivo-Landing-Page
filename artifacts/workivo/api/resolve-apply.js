const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const HIMALAYAS_HOSTS = new Set([
  "himalayas.app",
  "www.himalayas.app",
]);

/*
 * =========================================================
 * WORKIVO UNIVERSAL APPLICATION RESOLVER
 * =========================================================
 *
 * FLOW
 *
 * Himalayas URL
 *      ↓
 * URL-derived company + job title
 *      ↓
 * Himalayas source lookup (when available)
 *      ↓
 * Himalayas page Apply-link discovery
 *      ↓
 * Public ATS discovery
 *      ↓
 * Greenhouse
 * Lever
 * Ashby
 * SmartRecruiters
 * Workable
 * Recruitee
 *      ↓
 * Strong verified match?
 *      ↓
 * YES → direct application URL
 * NO  → original Himalayas URL
 *
 * IMPORTANT
 *
 * - No company-specific job IDs
 * - No company-specific application URLs
 * - No hardcoded employer mappings
 * - No invented URLs
 * - Himalayas search uses PAGE pagination
 * - ATS resolution can continue even if Himalayas lookup fails
 * - Direct Apply links from the actual Himalayas page are used
 *   when available
 *
 * =========================================================
 */


/*
 * =========================================================
 * CONFIGURATION
 * =========================================================
 */

const HIMALAYAS_TITLE_SEARCH_MAX_PAGES = 5;
const HIMALAYAS_COMPANY_SEARCH_MAX_PAGES = 12;
const HIMALAYAS_BROAD_SEARCH_MAX_PAGES = 3;

const PROVIDER_MATCH_THRESHOLD = 0.78;

const FETCH_TIMEOUT_MS = 5000;

const MAX_COMPANY_IDENTIFIERS = 8;


/*
 * =========================================================
 * KNOWN ATS HOSTS
 * =========================================================
 *
 * These are used only to verify that an outbound Himalayas
 * Apply link points to a recognized ATS/application system.
 *
 * No company-specific mappings are used.
 * =========================================================
 */

const ATS_HOST_PATTERNS = [
  {
    provider: "greenhouse",
    patterns: [
      "greenhouse.io",
      "greenhouse.com",
    ],
  },

  {
    provider: "lever",
    patterns: [
      "lever.co",
      "hire.lever.co",
    ],
  },

  {
    provider: "ashby",
    patterns: [
      "ashbyhq.com",
    ],
  },

  {
    provider: "smartrecruiters",
    patterns: [
      "smartrecruiters.com",
    ],
  },

  {
    provider: "workable",
    patterns: [
      "workable.com",
    ],
  },

  {
    provider: "recruitee",
    patterns: [
      "recruitee.com",
    ],
  },
];


/*
 * =========================================================
 * RESPONSE HELPERS
 * =========================================================
 */

function sendJson(res, status, body) {
  res.status(status);

  for (const [key, value] of Object.entries(JSON_HEADERS)) {
    res.setHeader(key, value);
  }

  return res.json(body);
}


/*
 * =========================================================
 * BASIC URL HELPERS
 * =========================================================
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
      url.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
}


/*
 * =========================================================
 * NORMALIZATION
 * =========================================================
 */

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;|&#47;/g, "/")
    .replace(/[^\p{L}\p{N}\s$€£./:-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompany(value = "") {
  return normalize(value)
    .replace(
      /\b(incorporated|inc|llc|ltd|limited|corp|corporation|co|company|plc)\b/g,
      " "
    )
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeTitle(value = "") {
  return normalize(value)
    .replace(
      /\b(full time|fulltime|part time|parttime|remote|hybrid|onsite|on site)\b/g,
      " "
    )
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocation(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9\s,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value = "") {
  return normalize(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function companyNameFromSlug(slug = "") {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


/*
 * =========================================================
 * TITLE EXTRACTION FROM HIMALAYAS JOB SLUG
 * =========================================================
 */

function titleFromJobSlug(jobSlug = "") {
  return String(jobSlug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+\d{4,}$/g, "")
    .trim();
}


/*
 * =========================================================
 * STOP WORDS / SIMILARITY
 * =========================================================
 */

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "for",
  "in",
  "on",
  "with",
  "at",
  "from",
  "by",
  "as",
  "is",
  "are",
  "be",
  "this",
  "that",
  "your",
  "our",
  "you",
  "we",
  "they",
  "their",
  "will",
  "can",
  "have",
  "has",
  "job",
  "role",
  "work",
  "working",
  "team",
  "remote",
]);

function tokenSet(value = "") {
  return new Set(
    normalize(value)
      .split(/\s+/)
      .map((word) =>
        word.replace(/[^a-z0-9]/g, "")
      )
      .filter(
        (word) =>
          word &&
          word.length > 2 &&
          !STOP_WORDS.has(word)
      )
  );
}

function jaccardSimilarity(a, b) {
  const first = tokenSet(a);
  const second = tokenSet(b);

  if (!first.size || !second.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of first) {
    if (second.has(token)) {
      intersection++;
    }
  }

  const union =
    first.size +
    second.size -
    intersection;

  return union > 0
    ? intersection / union
    : 0;
}

function titleSimilarity(a, b) {
  const first = normalizeTitle(a);
  const second = normalizeTitle(b);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  return jaccardSimilarity(first, second);
}


/*
 * =========================================================
 * JOB SLUG / TITLE MATCHING
 * =========================================================
 */

function cleanRequestedJobSlug(jobSlug = "") {
  return slugify(
    String(jobSlug || "")
      .replace(/[-_]+\d{4,}$/g, "")
  );
}

function jobSlugSimilarity(requestedJobSlug = "", job = {}) {
  const requestedSlug =
    cleanRequestedJobSlug(
      requestedJobSlug
    );

  if (!requestedSlug) {
    return 0;
  }

  const titleSlug =
    slugify(job.title || "");

  if (!titleSlug) {
    return 0;
  }

  if (titleSlug === requestedSlug) {
    return 1;
  }

  return jaccardSimilarity(
    requestedSlug.replace(/-/g, " "),
    titleSlug.replace(/-/g, " ")
  );
}

function exactJobTitleMatch(
  job,
  requestedTitle,
  requestedJobSlug
) {
  if (!job) {
    return false;
  }

  const normalizedRequested =
    normalizeTitle(requestedTitle);

  const normalizedJob =
    normalizeTitle(job.title || "");

  if (
    normalizedRequested &&
    normalizedRequested === normalizedJob
  ) {
    return true;
  }

  const requestedSlug =
    cleanRequestedJobSlug(
      requestedJobSlug
    );

  const jobTitleSlug =
    slugify(job.title || "");

  return (
    requestedSlug &&
    jobTitleSlug &&
    requestedSlug === jobTitleSlug
  );
}


/*
 * =========================================================
 * LOCATION HELPERS
 * =========================================================
 */

function normalizeLocationRestrictions(
  restrictions
) {
  if (!Array.isArray(restrictions)) {
    return [];
  }

  return restrictions
    .map((item) => {
      if (
        item &&
        typeof item === "object"
      ) {
        return (
          item.name ||
          item.slug ||
          item.alpha2 ||
          ""
        );
      }

      return String(item || "");
    })
    .map(normalizeLocation)
    .filter(Boolean);
}

function locationMatches(
  sourceRestrictions,
  providerLocation
) {
  const restrictions =
    normalizeLocationRestrictions(
      sourceRestrictions
    );

  const location =
    normalizeLocation(
      providerLocation
    );

  if (!restrictions.length) {
    return true;
  }

  if (
    location.includes("remote") ||
    location.includes("worldwide") ||
    location.includes("anywhere")
  ) {
    return true;
  }

  for (const country of restrictions) {
    if (
      country &&
      location.includes(country)
    ) {
      return true;
    }
  }

  return false;
}


/*
 * =========================================================
 * SALARY HELPERS
 * =========================================================
 */

function numberValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function salaryMatches(
  sourceJob,
  providerJob
) {
  if (
    sourceJob.minSalary === null &&
    sourceJob.maxSalary === null
  ) {
    return true;
  }

  if (
    providerJob.minSalary === null &&
    providerJob.maxSalary === null
  ) {
    return true;
  }

  const sourceMin =
    numberValue(sourceJob.minSalary);

  const sourceMax =
    numberValue(sourceJob.maxSalary);

  const providerMin =
    numberValue(providerJob.minSalary);

  const providerMax =
    numberValue(providerJob.maxSalary);

  if (
    sourceMin === null ||
    providerMin === null
  ) {
    return true;
  }

  const sourceUpper =
    sourceMax ?? sourceMin;

  const providerUpper =
    providerMax ?? providerMin;

  return (
    sourceMin <= providerUpper &&
    providerMin <= sourceUpper
  );
}


/*
 * =========================================================
 * FETCH HELPERS
 * =========================================================
 */

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = FETCH_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    return await fetch(
      url,
      {
        ...options,

        signal:
          controller.signal,

        headers: {
          Accept:
            "application/json",

          ...(options.headers || {}),
        },
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(
  url,
  options = {},
  timeoutMs = FETCH_TIMEOUT_MS,
  retries = 1
) {
  let lastStatus = 0;

  for (
    let attempt = 0;
    attempt <= retries;
    attempt++
  ) {
    try {
      const response =
        await fetchWithTimeout(
          url,
          options,
          timeoutMs
        );

      lastStatus =
        response.status;

      if (
        response.status === 429 &&
        attempt < retries
      ) {
        const retryAfter =
          Number(
            response.headers.get(
              "retry-after"
            )
          );

        const waitMs =
          Number.isFinite(
            retryAfter
          )
            ? Math.min(
                retryAfter * 1000,
                2000
              )
            : 400;

        await sleep(waitMs);

        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          status:
            response.status,
          data: null,
        };
      }

      const data =
        await response.json();

      return {
        ok: true,
        status:
          response.status,
        data,
      };
    } catch {
      if (
        attempt < retries
      ) {
        await sleep(250);
        continue;
      }
    }
  }

  return {
    ok: false,
    status: lastStatus,
    data: null,
  };
}


/*
 * =========================================================
 * HIMALAYAS PAGE FETCH
 * =========================================================
 *
 * NEW:
 *
 * If the Himalayas API cannot identify the listing, we
 * inspect the actual job page and look for its outbound
 * "Apply now" link.
 *
 * This prevents Workivo from depending entirely on
 * rediscovering the job through Himalayas search.
 * =========================================================
 */

async function fetchHimalayasPageHtml(
  url
) {
  try {
    const response =
      await fetchWithTimeout(
        url,
        {
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
          },
        },
        7000
      );

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}


/*
 * =========================================================
 * ATS HOST DETECTION
 * =========================================================
 */

function detectAtsProviderFromUrl(
  value
) {
  try {
    const parsed =
      new URL(value);

    const hostname =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    for (
      const provider
      of ATS_HOST_PATTERNS
    ) {
      for (
        const pattern
        of provider.patterns
      ) {
        if (
          hostname === pattern ||
          hostname.endsWith(
            `.${pattern}`
          )
        ) {
          return provider.provider;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}


/*
 * =========================================================
 * HTML ENTITY DECODING
 * =========================================================
 */

function decodeHtmlEntities(
  value = ""
) {
  return String(value)
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;|&#x27;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    );
}


/*
 * =========================================================
 * DIRECT HIMALAYAS APPLY LINK DISCOVERY
 * =========================================================
 *
 * NEW:
 *
 * Looks specifically for external links associated with
 * "Apply now" and only accepts recognized ATS domains.
 *
 * We do NOT accept arbitrary external links.
 * =========================================================
 */

function extractDirectHimalayasApplyLink(
  html
) {
  if (!html) {
    return null;
  }

  const candidates = [];

  /*
   * Extract normal anchor tags.
   */

  const anchorRegex =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while (
    (match =
      anchorRegex.exec(html)) !== null
  ) {
    const href =
      decodeHtmlEntities(
        match[1]
      ).trim();

    const text =
      normalize(
        match[2]
          .replace(
            /<[^>]*>/g,
            " "
          )
      );

    if (!href) {
      continue;
    }

    let absoluteUrl = href;

    try {
      absoluteUrl =
        new URL(
          href,
          "https://himalayas.app"
        ).toString();
    } catch {
      continue;
    }

    if (
      !isHttpUrl(
        absoluteUrl
      )
    ) {
      continue;
    }

    if (
      isHimalayasUrl(
        absoluteUrl
      )
    ) {
      continue;
    }

    const provider =
      detectAtsProviderFromUrl(
        absoluteUrl
      );

    if (!provider) {
      continue;
    }

    const applyText =
      text.includes("apply") ||
      text.includes("application") ||
      text.includes("apply now");

    candidates.push({
      url:
        absoluteUrl,
      provider,
      score:
        applyText
          ? 1
          : 0.75,
    });
  }


  /*
   * Some pages can expose the destination URL in
   * JSON/script data rather than a normal anchor.
   *
   * Look for known ATS URLs in the raw HTML as a
   * secondary fallback.
   */

  const knownUrlRegex =
    /https?:\/\/[^"'\\\s<>]+/gi;

  const rawUrls =
    html.match(
      knownUrlRegex
    ) || [];

  for (
    const rawUrl
    of rawUrls
  ) {
    const cleaned =
      decodeHtmlEntities(
        rawUrl
      )
        .replace(
          /[),.;]+$/,
          ""
        );

    const provider =
      detectAtsProviderFromUrl(
        cleaned
      );

    if (
      !provider ||
      !isHttpUrl(cleaned)
    ) {
      continue;
    }

    if (
      isHimalayasUrl(cleaned)
    ) {
      continue;
    }

    if (
      candidates.some(
        (item) =>
          item.url ===
          cleaned
      )
    ) {
      continue;
    }

    candidates.push({
      url:
        cleaned,
      provider,
      score:
        0.65,
    });
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  return candidates[0];
}


/*
 * =========================================================
 * HIMALAYAS URL PARSER
 * =========================================================
 */

function extractHimalayasJob(url) {
  try {
    const parsed =
      new URL(url);

    const match =
      parsed.pathname.match(
        /^\/companies\/([^/]+)\/jobs\/([^/]+)\/?$/i
      );

    if (!match) {
      return null;
    }

    const companySlug =
      decodeURIComponent(
        match[1]
      );

    const jobSlug =
      decodeURIComponent(
        match[2]
      );

    return {
      companySlug,

      jobSlug,

      requestedTitle:
        titleFromJobSlug(
          jobSlug
        ),
    };
  } catch {
    return null;
  }
}


/*
 * =========================================================
 * HIMALAYAS COMPANY MATCH
 * =========================================================
 */

function companyMatches(
  job,
  requestedCompanySlug
) {
  const requested =
    normalizeCompany(
      requestedCompanySlug
    );

  if (!requested) {
    return false;
  }

  const jobSlug =
    normalizeCompany(
      job?.companySlug || ""
    );

  const jobName =
    normalizeCompany(
      job?.companyName || ""
    );

  if (
    requested === jobSlug ||
    requested === jobName
  ) {
    return true;
  }

  if (
    jobSlug &&
    (
      requested.includes(jobSlug) ||
      jobSlug.includes(requested)
    )
  ) {
    return true;
  }

  return (
    jaccardSimilarity(
      requested,
      jobSlug || jobName
    ) >= 0.75
  );
}


/*
 * =========================================================
 * HIMALAYAS CANDIDATE SCORING
 * =========================================================
 */

function scoreHimalayasCandidate(
  job,
  requestedTitle,
  companySlug,
  jobSlug
) {
  const titleScore =
    titleSimilarity(
      requestedTitle,
      job.title || ""
    );

  const companyScore =
    companyMatches(
      job,
      companySlug
    )
      ? 1
      : 0;

  const slugScore =
    jobSlugSimilarity(
      jobSlug,
      job
    );

  let score =
    titleScore * 0.70 +
    companyScore * 0.20 +
    slugScore * 0.10;

  if (
    exactJobTitleMatch(
      job,
      requestedTitle,
      jobSlug
    )
  ) {
    score += 0.15;
  }

  return {
    score: Math.min(score, 1),
    titleScore,
    companyScore,
    slugScore,
  };
}


/*
 * =========================================================
 * HIMALAYAS SEARCH REQUEST
 * =========================================================
 */

async function searchHimalayasPage({
  companySlug = "",
  query = "",
  page = 1,
  sort = "relevant",
}) {
  const params =
    new URLSearchParams();

  params.set(
    "page",
    String(page)
  );

  params.set(
    "sort",
    sort
  );

  if (companySlug) {
    params.set(
      "company",
      companySlug
    );
  }

  if (query) {
    params.set(
      "q",
      query
    );
  }

  const endpoint =
    "https://himalayas.app/jobs/api/search?" +
    params.toString();

  return fetchJson(
    endpoint,
    {},
    6000,
    1
  );
}


/*
 * =========================================================
 * HIMALAYAS TITLE QUERY VARIANTS
 * =========================================================
 */

function buildTitleQueries(
  requestedTitle,
  jobSlug
) {
  const values = [];

  function add(value) {
    const cleaned =
      normalizeTitle(value);

    if (
      cleaned &&
      !values.includes(cleaned)
    ) {
      values.push(cleaned);
    }
  }

  add(requestedTitle);

  add(
    String(jobSlug || "")
      .replace(
        /[-_]+\d{4,}$/,
        ""
      )
      .replace(
        /[-_]+/g,
        " "
      )
  );

  const tokens =
    tokenSet(requestedTitle);

  if (tokens.size >= 2) {
    add(
      Array.from(tokens)
        .slice(0, 4)
        .join(" ")
    );
  }

  return values.slice(0, 3);
}


/*
 * =========================================================
 * HIMALAYAS SOURCE JOB DISCOVERY
 * =========================================================
 */

async function getHimalayasJob(
  companySlug,
  jobSlug,
  requestedTitleOverride = ""
) {
  const requestedTitle =
    requestedTitleOverride ||
    titleFromJobSlug(jobSlug);

  if (
    !companySlug ||
    !requestedTitle
  ) {
    return null;
  }

  const allCandidates = [];

  const seen =
    new Set();

  function collectJobs(
    jobs
  ) {
    if (!Array.isArray(jobs)) {
      return;
    }

    for (const job of jobs) {
      if (!job) {
        continue;
      }

      if (
        !companyMatches(
          job,
          companySlug
        )
      ) {
        continue;
      }

      const identity =
        String(
          job.guid ||
          job.applicationLink ||
          `${job.companySlug}:${job.title}:${job.pubDate || ""}`
        );

      if (
        seen.has(identity)
      ) {
        continue;
      }

      seen.add(identity);

      allCandidates.push(job);
    }
  }

  function findExact(
    jobs
  ) {
    if (!Array.isArray(jobs)) {
      return null;
    }

    for (const job of jobs) {
      if (
        !companyMatches(
          job,
          companySlug
        )
      ) {
        continue;
      }

      if (
        exactJobTitleMatch(
          job,
          requestedTitle,
          jobSlug
        )
      ) {
        return job;
      }
    }

    return null;
  }


  /*
   * STAGE 1
   * Company + title search
   */

  const titleQueries =
    buildTitleQueries(
      requestedTitle,
      jobSlug
    );

  for (
    const query
    of titleQueries
  ) {
    for (
      let page = 1;
      page <=
      HIMALAYAS_TITLE_SEARCH_MAX_PAGES;
      page++
    ) {
      const result =
        await searchHimalayasPage({
          companySlug,
          query,
          page,
          sort:
            "relevant",
        });

      if (
        !result.ok ||
        !result.data ||
        !Array.isArray(
          result.data.jobs
        )
      ) {
        break;
      }

      const jobs =
        result.data.jobs;

      const exact =
        findExact(jobs);

      if (exact) {
        return exact;
      }

      collectJobs(jobs);

      const responseLimit =
        numberValue(
          result.data.limit
        ) || 20;

      const totalCount =
        numberValue(
          result.data.totalCount
        );

      if (
        !jobs.length ||
        jobs.length <
          responseLimit ||
        (
          totalCount !== null &&
          page * responseLimit >=
            totalCount
        )
      ) {
        break;
      }
    }
  }


  /*
   * STAGE 2
   * Company-only search
   */

  for (
    let page = 1;
    page <=
    HIMALAYAS_COMPANY_SEARCH_MAX_PAGES;
    page++
  ) {
    const result =
      await searchHimalayasPage({
        companySlug,
        query: "",
        page,
        sort:
          "recent",
      });

    if (
      !result.ok ||
      !result.data ||
      !Array.isArray(
        result.data.jobs
      )
    ) {
      break;
    }

    const jobs =
      result.data.jobs;

    const exact =
      findExact(jobs);

    if (exact) {
      return exact;
    }

    collectJobs(jobs);

    const responseLimit =
      numberValue(
        result.data.limit
      ) || 20;

    const totalCount =
      numberValue(
        result.data.totalCount
      );

    if (
      !jobs.length ||
      jobs.length <
        responseLimit ||
      (
        totalCount !== null &&
        page * responseLimit >=
          totalCount
      )
    ) {
      break;
    }
  }


  /*
   * STAGE 3
   * Global title search
   */

  for (
    const query
    of titleQueries.slice(0, 2)
  ) {
    for (
      let page = 1;
      page <=
      HIMALAYAS_BROAD_SEARCH_MAX_PAGES;
      page++
    ) {
      const result =
        await searchHimalayasPage({
          companySlug: "",
          query,
          page,
          sort:
            "relevant",
        });

      if (
        !result.ok ||
        !result.data ||
        !Array.isArray(
          result.data.jobs
        )
      ) {
        break;
      }

      const jobs =
        result.data.jobs;

      const exact =
        findExact(jobs);

      if (exact) {
        return exact;
      }

      collectJobs(jobs);

      if (
        !jobs.length ||
        jobs.length < 20
      ) {
        break;
      }
    }
  }


  /*
   * FINAL HIMALAYAS RANKING
   */

  if (!allCandidates.length) {
    return null;
  }

  const scored =
    allCandidates
      .map((job) => ({
        job,

        evidence:
          scoreHimalayasCandidate(
            job,
            requestedTitle,
            companySlug,
            jobSlug
          ),
      }))
      .sort(
        (a, b) =>
          b.evidence.score -
          a.evidence.score
      );

  const best =
    scored[0];

  if (!best) {
    return null;
  }

  if (
    best.evidence.titleScore >=
    0.90
  ) {
    return best.job;
  }

  if (
    best.evidence.titleScore >=
      0.65 &&
    best.evidence.score >=
      0.78
  ) {
    return best.job;
  }

  return null;
}


/*
 * =========================================================
 * COMPANY IDENTIFIERS
 * =========================================================
 */

function companyIdentifiers(
  companyName,
  companySlug
) {
  const values = [];

  function add(value) {
    if (!value) {
      return;
    }

    const cleaned =
      String(value)
        .trim()
        .toLowerCase();

    if (
      cleaned &&
      !values.includes(cleaned)
    ) {
      values.push(cleaned);
    }
  }

  const canonicalSlug =
    slugify(
      companySlug ||
        companyName
    );

  const nameSlug =
    slugify(
      companyName
    );

  const compactSlug =
    canonicalSlug.replace(
      /-/g,
      ""
    );

  const compactName =
    normalizeCompany(
      companyName
    );

  add(canonicalSlug);
  add(nameSlug);
  add(compactSlug);
  add(compactName);

  const companyTokens =
    normalize(
      companyName
    )
      .split(/\s+/)
      .map(
        (token) =>
          token.replace(
            /[^a-z0-9]/g,
            ""
          )
      )
      .filter(
        (token) =>
          token.length >= 4
      );

  for (
    const token
    of companyTokens
  ) {
    add(token);
  }

  const filtered =
    values.filter(
      (value) =>
        ![
          "inc",
          "llc",
          "ltd",
          "limited",
          "corp",
          "company",
          "co",
        ].includes(value)
    );

  return filtered
    .slice(
      0,
      MAX_COMPANY_IDENTIFIERS
    );
}


/*
 * =========================================================
 * PROVIDER MATCH SCORING
 * =========================================================
 */

function scoreProviderJob(
  sourceJob,
  providerJob,
  identifierConfidence = 1
) {
  const titleCandidates = [
    sourceJob.requestedTitle,
    sourceJob.title,
  ].filter(Boolean);

  let titleScore = 0;
  let matchedTitle = "";

  for (
    const titleCandidate
    of titleCandidates
  ) {
    const candidateScore =
      titleSimilarity(
        titleCandidate,
        providerJob.title
      );

    if (
      candidateScore >
      titleScore
    ) {
      titleScore =
        candidateScore;

      matchedTitle =
        titleCandidate;
    }
  }

  if (
    titleScore <
    PROVIDER_MATCH_THRESHOLD
  ) {
    return {
      score: 0,
      titleScore,
      locationScore: 0,
      descriptionScore: 0,
      salaryScore: 0,
      identifierConfidence,
      matchedTitle,
    };
  }

  const sourceRestrictions =
    sourceJob.locationRestrictions ||
    [];

  const providerLocation =
    providerJob.location ||
    "";

  const locationOk =
    locationMatches(
      sourceRestrictions,
      providerLocation
    );

  if (
    sourceRestrictions.length &&
    !locationOk
  ) {
    return {
      score: 0,
      titleScore,
      locationScore: 0,
      descriptionScore: 0,
      salaryScore: 0,
      identifierConfidence,
      matchedTitle,
    };
  }

  const locationScore =
    sourceRestrictions.length
      ? 1
      : 0.5;

  const descriptionScore =
    providerJob.description
      ? jaccardSimilarity(
          sourceJob.description ||
            "",
          providerJob.description
        )
      : 0;

  const salaryScore =
    salaryMatches(
      sourceJob,
      providerJob
    )
      ? 1
      : 0;

  const score =
    titleScore * 0.60 +
    locationScore * 0.15 +
    Math.min(
      descriptionScore,
      1
    ) * 0.10 +
    salaryScore * 0.05 +
    identifierConfidence * 0.10;

  return {
    score,
    titleScore,
    locationScore,
    descriptionScore,
    salaryScore,
    identifierConfidence,
    matchedTitle,
  };
}


/*
 * =========================================================
 * GREENHOUSE
 * =========================================================
 */

async function resolveGreenhouse(
  sourceJob,
  identifiers
) {
  const attempts =
    identifiers.map(
      async (identifier) => {
        const url =
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
            identifier
          )}/jobs?content=true`;

        const result =
          await fetchJson(
            url,
            {},
            5000,
            0
          );

        if (
          !result.ok ||
          !result.data ||
          !Array.isArray(
            result.data.jobs
          )
        ) {
          return null;
        }

        let best = null;

        for (
          const job
          of result.data.jobs
        ) {
          const candidate = {
            title:
              job.title || "",

            location:
              job.location?.name ||
              "",

            description:
              job.content || "",

            minSalary:
              null,

            maxSalary:
              null,
          };

          const confidence =
            normalizeCompany(
              identifier
            ) ===
            normalizeCompany(
              sourceJob.companySlug ||
                ""
            )
              ? 1
              : 0.9;

          const score =
            scoreProviderJob(
              sourceJob,
              candidate,
              confidence
            );

          if (
            score.score >=
              PROVIDER_MATCH_THRESHOLD &&
            (
              !best ||
              score.score >
                best.score.score
            )
          ) {
            best = {
              score,
              job,
              identifier,
            };
          }
        }

        if (!best) {
          return null;
        }

        const applicationUrl =
          best.job.absolute_url ||
          "";

        if (
          !isHttpUrl(
            applicationUrl
          )
        ) {
          return null;
        }

        return {
          provider:
            "greenhouse",

          method:
            "greenhouse-public-job-board-api",

          applicationUrl,

          matchedJob: {
            title:
              best.job.title,

            location:
              best.job.location?.name ||
              "",
          },

          score:
            best.score,

          identifier:
            best.identifier,
        };
      }
    );

  const results =
    await Promise.all(
      attempts
    );

  return (
    results
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score.score -
          a.score.score
      )[0] ||
    null
  );
}


/*
 * =========================================================
 * LEVER
 * =========================================================
 */

async function resolveLever(
  sourceJob,
  identifiers
) {
  const attempts = [];

  for (
    const identifier
    of identifiers
  ) {
    for (
      const base of [
        "https://api.lever.co/v0/postings",
        "https://api.eu.lever.co/v0/postings",
      ]
    ) {
      attempts.push(
        (async () => {
          const url =
            `${base}/${encodeURIComponent(
              identifier
            )}?mode=json`;

          const result =
            await fetchJson(
              url,
              {},
              5000,
              0
            );

          if (
            !result.ok ||
            !Array.isArray(
              result.data
            )
          ) {
            return null;
          }

          let best = null;

          for (
            const job
            of result.data
          ) {
            const categories =
              job.categories || {};

            const candidate = {
              title:
                job.text || "",

              location:
                categories.location ||
                (
                  Array.isArray(
                    categories.allLocations
                  )
                    ? categories.allLocations.join(
                        ", "
                      )
                    : ""
                ),

              description:
                job.descriptionPlain ||
                job.openingPlain ||
                "",

              minSalary:
                job.salaryRange?.min ??
                null,

              maxSalary:
                job.salaryRange?.max ??
                null,
            };

            const confidence =
              normalizeCompany(
                identifier
              ) ===
              normalizeCompany(
                sourceJob.companySlug ||
                  ""
              )
                ? 1
                : 0.9;

            const score =
              scoreProviderJob(
                sourceJob,
                candidate,
                confidence
              );

            if (
              score.score >=
                PROVIDER_MATCH_THRESHOLD &&
              (
                !best ||
                score.score >
                  best.score.score
              )
            ) {
              best = {
                score,
                job,
                identifier,
              };
            }
          }

          if (!best) {
            return null;
          }

          const applicationUrl =
            best.job.applyUrl ||
            best.job.hostedUrl ||
            "";

          if (
            !isHttpUrl(
              applicationUrl
            )
          ) {
            return null;
          }

          return {
            provider:
              "lever",

            method:
              "lever-public-postings-api",

            applicationUrl,

            matchedJob: {
              title:
                best.job.text,

              location:
                best.job.categories
                  ?.location ||
                "",
            },

            score:
              best.score,

            identifier:
              best.identifier,
          };
        })()
      );
    }
  }

  const results =
    await Promise.all(
      attempts
    );

  return (
    results
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score.score -
          a.score.score
      )[0] ||
    null
  );
}


/*
 * =========================================================
 * ASHBY
 * =========================================================
 */

async function resolveAshby(
  sourceJob,
  identifiers
) {
  const attempts =
    identifiers.map(
      async (identifier) => {
        const url =
          `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
            identifier
          )}?includeCompensation=true`;

        const result =
          await fetchJson(
            url,
            {},
            5000,
            0
          );

        if (
          !result.ok ||
          !result.data ||
          !Array.isArray(
            result.data.jobs
          )
        ) {
          return null;
        }

        let best = null;

        for (
          const job
          of result.data.jobs
        ) {
          const locations = [
            job.location || "",

            ...(Array.isArray(
              job.secondaryLocations
            )
              ? job.secondaryLocations.map(
                  (item) =>
                    item?.location ||
                    item?.address
                      ?.addressCountry ||
                    ""
                )
              : []),
          ]
            .filter(Boolean)
            .join(", ");

          const candidate = {
            title:
              job.title || "",

            location:
              locations,

            description:
              job.descriptionPlain ||
              "",

            minSalary:
              numberValue(
                job.compensation
                  ?.minSalary
              ),

            maxSalary:
              numberValue(
                job.compensation
                  ?.maxSalary
              ),
          };

          const confidence =
            normalizeCompany(
              identifier
            ) ===
            normalizeCompany(
              sourceJob.companySlug ||
                ""
            )
              ? 1
              : 0.9;

          const score =
            scoreProviderJob(
              sourceJob,
              candidate,
              confidence
            );

          if (
            score.score >=
              PROVIDER_MATCH_THRESHOLD &&
            (
              !best ||
              score.score >
                best.score.score
            )
          ) {
            best = {
              score,
              job,
              identifier,
            };
          }
        }

        if (!best) {
          return null;
        }

        const applicationUrl =
          best.job.applyUrl ||
          best.job.jobUrl ||
          "";

        if (
          !isHttpUrl(
            applicationUrl
          )
        ) {
          return null;
        }

        return {
          provider:
            "ashby",

          method:
            "ashby-public-job-posting-api",

          applicationUrl,

          matchedJob: {
            title:
              best.job.title,

            location:
              best.job.location ||
              "",
          },

          score:
            best.score,

          identifier:
            best.identifier,
        };
      }
    );

  const results =
    await Promise.all(
      attempts
    );

  return (
    results
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score.score -
          a.score.score
      )[0] ||
    null
  );
}


/*
 * =========================================================
 * SMARTRECRUITERS
 * =========================================================
 */

async function resolveSmartRecruiters(
  sourceJob,
  identifiers
) {
  const attempts =
    identifiers.map(
      async (identifier) => {
        const postings = [];

        const MAX_PAGES = 10;
        const LIMIT = 100;

        for (
          let page = 0;
          page < MAX_PAGES;
          page++
        ) {
          const offset =
            page * LIMIT;

          const query =
            sourceJob.requestedTitle ||
            sourceJob.title ||
            "";

          const searchUrl =
            `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
              identifier
            )}/postings?limit=${LIMIT}&offset=${offset}&q=${encodeURIComponent(
              query
            )}`;

          const listResult =
            await fetchJson(
              searchUrl,
              {},
              5000,
              0
            );

          if (
            !listResult.ok ||
            !listResult.data ||
            !Array.isArray(
              listResult.data.content
            )
          ) {
            break;
          }

          postings.push(
            ...listResult.data.content
          );

          const totalFound =
            numberValue(
              listResult.data
                .totalFound
            );

          if (
            totalFound !== null &&
            offset +
              listResult.data
                .content.length >=
              totalFound
          ) {
            break;
          }

          if (
            listResult.data.content
              .length < LIMIT
          ) {
            break;
          }
        }

        const unique =
          new Map();

        for (
          const posting
          of postings
        ) {
          const key =
            String(
              posting?.id ||
              posting?.uuid ||
              posting?.ref ||
              ""
            );

          if (
            key &&
            !unique.has(key)
          ) {
            unique.set(
              key,
              posting
            );
          }
        }

        if (!unique.size) {
          const fallbackUrl =
            `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
              identifier
            )}/postings?limit=100&offset=0`;

          const fallbackResult =
            await fetchJson(
              fallbackUrl,
              {},
              5000,
              0
            );

          if (
            fallbackResult.ok &&
            fallbackResult.data &&
            Array.isArray(
              fallbackResult.data.content
            )
          ) {
            for (
              const posting
              of fallbackResult.data.content
            ) {
              const key =
                String(
                  posting?.id ||
                  posting?.uuid ||
                  ""
                );

              if (
                key &&
                !unique.has(key)
              ) {
                unique.set(
                  key,
                  posting
                );
              }
            }
          }
        }

        const postingCandidates =
          Array.from(
            unique.values()
          );

        let best = null;

        for (
          const posting
          of postingCandidates.slice(
            0,
            30
          )
        ) {
          if (!posting?.id) {
            continue;
          }

          const detailUrl =
            `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
              identifier
            )}/postings/${encodeURIComponent(
              posting.id
            )}`;

          const detailResult =
            await fetchJson(
              detailUrl,
              {},
              5000,
              0
            );

          if (
            !detailResult.ok ||
            !detailResult.data
          ) {
            continue;
          }

          const detail =
            detailResult.data;

          const candidate = {
            title:
              detail.name ||
              posting.name ||
              "",

            location: [
              detail.location?.city,
              detail.location?.region,
              detail.location?.country,
            ]
              .filter(Boolean)
              .join(", "),

            description:
              detail.jobAd
                ?.sections
                ?.jobDescription
                ?.text ||
              "",

            minSalary:
              null,

            maxSalary:
              null,
          };

          const confidence =
            normalizeCompany(
              identifier
            ) ===
            normalizeCompany(
              sourceJob.companySlug ||
                ""
            )
              ? 1
              : 0.9;

          const score =
            scoreProviderJob(
              sourceJob,
              candidate,
              confidence
            );

          if (
            score.score <
            PROVIDER_MATCH_THRESHOLD
          ) {
            continue;
          }

          const applicationUrl =
            detail.applyUrl ||
            posting.applyUrl ||
            "";

          if (
            !isHttpUrl(
              applicationUrl
            )
          ) {
            continue;
          }

          const result = {
            provider:
              "smartrecruiters",

            method:
              "smartrecruiters-public-posting-api",

            applicationUrl,

            matchedJob: {
              title:
                candidate.title,

              location:
                candidate.location,
            },

            score,

            identifier,
          };

          if (
            !best ||
            result.score.score >
              best.score.score
          ) {
            best = result;
          }
        }

        return best;
      }
    );

  const results =
    await Promise.all(
      attempts
    );

  return (
    results
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score.score -
          a.score.score
      )[0] ||
    null
  );
}


/*
 * =========================================================
 * WORKABLE
 * =========================================================
 */

async function resolveWorkable(
  sourceJob,
  identifiers
) {
  const attempts =
    identifiers.map(
      async (identifier) => {
        const url =
          `https://www.workable.com/api/accounts/${encodeURIComponent(
            identifier
          )}?details=true`;

        const result =
          await fetchJson(
            url,
            {},
            5000,
            0
          );

        if (
          !result.ok ||
          !result.data
        ) {
          return null;
        }

        const jobs =
          Array.isArray(
            result.data.jobs
          )
            ? result.data.jobs
            : [];

        let best = null;

        for (
          const job
          of jobs
        ) {
          const location =
            job.location
              ?.location_str ||
            [
              job.location?.city,
              job.location?.region,
              job.location?.country,
            ]
              .filter(Boolean)
              .join(", ");

          const candidate = {
            title:
              job.title ||
              job.full_title ||
              "",

            location,

            description:
              job.description ||
              job.full_description ||
              "",

            minSalary:
              numberValue(
                job.salary
                  ?.salary_from
              ),

            maxSalary:
              numberValue(
                job.salary
                  ?.salary_to
              ),
          };

          const confidence =
            normalizeCompany(
              identifier
            ) ===
            normalizeCompany(
              sourceJob.companySlug ||
                ""
            )
              ? 1
              : 0.9;

          const score =
            scoreProviderJob(
              sourceJob,
              candidate,
              confidence
            );

          if (
            score.score >=
              PROVIDER_MATCH_THRESHOLD &&
            (
              !best ||
              score.score >
                best.score.score
            )
          ) {
            best = {
              score,
              job,
              identifier,
            };
          }
        }

        if (!best) {
          return null;
        }

        const applicationUrl =
          best.job.shortlink ||
          best.job.application_url ||
          best.job.url ||
          "";

        if (
          !isHttpUrl(
            applicationUrl
          )
        ) {
          return null;
        }

        return {
          provider:
            "workable",

          method:
            "workable-public-careers-api",

          applicationUrl,

          matchedJob: {
            title:
              best.job.title ||
              best.job.full_title ||
              "",

            location:
              best.job.location
                ?.location_str ||
              "",
          },

          score:
            best.score,

          identifier:
            best.identifier,
        };
      }
    );

  const results =
    await Promise.all(
      attempts
    );

  return (
    results
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score.score -
          a.score.score
      )[0] ||
    null
  );
}


/*
 * =========================================================
 * RECRUITEE
 * =========================================================
 */

async function resolveRecruitee(
  sourceJob,
  identifiers
) {
  /*
   * Recruitee requires special handling because the
   * Himalayas company label can be "Recruitee" even when
   * the actual employer owns a different Recruitee
   * subdomain.
   *
   * Example:
   *
   * Himalayas:
   * https://himalayas.app/companies/recruitee/jobs/...
   *
   * Actual employer:
   * https://aikidosecurity.recruitee.com/o/...
   *
   * Therefore we discover the real Recruitee URL from
   * the Himalayas job page instead of guessing:
   *
   * https://recruitee.recruitee.com/...
   */

  const sourceUrl =
    sourceJob?.url ||
    "";

  if (
    !isHimalayasUrl(
      sourceUrl
    )
  ) {
    return null;
  }

  const html =
    await fetchHimalayasPageHtml(
      sourceUrl
    );

  if (!html) {
    return null;
  }

  /*
   * Decode HTML entities and escaped slashes so that
   * URLs such as:
   *
   * https:\/\/aikidosecurity.recruitee.com\/o\/...
   *
   * become:
   *
   * https://aikidosecurity.recruitee.com/o/...
   */

  const decodedHtml =
    decodeHtmlEntities(
      html
    );

  const normalizedHtml =
    decodedHtml
      .replace(
        /\\u002F/gi,
        "/"
      )
      .replace(
        /\\\//g,
        "/"
      )
      .replace(
        /&sol;/gi,
        "/"
      );

  const recruiteeUrls =
    new Set();

  /*
   * =====================================================
   * DISCOVER NORMAL RECRUITEE JOB / APPLICATION URLS
   * =====================================================
   */

  const normalUrlRegex =
    /https?:\/\/[^\s"'<>\\]+\.recruitee\.com\/(?:o|c)\/[^\s"'<>\\]+/gi;

  for (
    const match of normalizedHtml.matchAll(
      normalUrlRegex
    )
  ) {
    const candidate =
      match[0]
        .replace(
          /[),.;]+$/,
          ""
        )
        .trim();

    if (
      isHttpUrl(
        candidate
      )
    ) {
      recruiteeUrls.add(
        candidate
      );
    }
  }

  /*
   * =====================================================
   * DISCOVER ESCAPED RECRUITEE URLS
   * =====================================================
   */

  const escapedUrlRegex =
    /https?:\\\/\\\/[^"'<>\\\s]+\.recruitee\.com\\\/(?:o|c)\\\/[^"'<>\\\s]+/gi;

  for (
    const match of decodedHtml.matchAll(
      escapedUrlRegex
    )
  ) {
    const candidate =
      match[0]
        .replace(
          /\\\//g,
          "/"
        )
        .replace(
          /[),.;]+$/,
          ""
        )
        .trim();

    if (
      isHttpUrl(
        candidate
      )
    ) {
      recruiteeUrls.add(
        candidate
      );
    }
  }

  /*
   * =====================================================
   * DISCOVER RECRUITEE URLS WITHOUT https:// PREFIX
   * =====================================================
   */

  const subdomainRegex =
    /(?:https?:\/\/)?([a-z0-9-]+)\.recruitee\.com\/(?:o|c)\/[a-z0-9_%~./?=&+#-]+/gi;

  for (
    const match of normalizedHtml.matchAll(
      subdomainRegex
    )
  ) {
    const raw =
      match[0];

    const candidate =
      raw.startsWith(
        "http"
      )
        ? raw
        : `https://${raw}`;

    const cleaned =
      candidate
        .replace(
          /[),.;]+$/,
          ""
        )
        .trim();

    if (
      isHttpUrl(
        cleaned
      )
    ) {
      recruiteeUrls.add(
        cleaned
      );
    }
  }

  /*
   * Nothing useful was exposed by the Himalayas page.
   *
   * IMPORTANT:
   * We do NOT guess a Recruitee company subdomain.
   */

  if (
    !recruiteeUrls.size
  ) {
    return null;
  }

  /*
   * Prefer /o/ job pages over /c/ application pages
   * because the job page lets us verify the title first.
   */

  const candidates =
    [
      ...recruiteeUrls,
    ]
      .map(
        (url) => ({
          url,

          isJobPage:
            /\/o\//i.test(
              url
            ),

          isApplicationPage:
            /\/c\//i.test(
              url
            ),
        })
      )
      .sort(
        (a, b) => {
          if (
            a.isJobPage !==
            b.isJobPage
          ) {
            return a.isJobPage
              ? -1
              : 1;
          }

          return (
            a.url.length -
            b.url.length
          );
        }
      );

  /*
   * =====================================================
   * VERIFY DISCOVERED RECRUITEE JOB PAGE
   * =====================================================
   */

  for (
    const candidate
    of candidates
  ) {
    if (
      !candidate.isJobPage
    ) {
      continue;
    }

    try {
      const response =
        await fetchWithTimeout(
          candidate.url,
          {
            headers: {
              Accept:
                "text/html,application/xhtml+xml",
            },
          },
          7000
        );

      if (
        !response.ok
      ) {
        continue;
      }

      const recruiteeHtml =
        await response.text();

      const recruiteeDecoded =
        decodeHtmlEntities(
          recruiteeHtml
        );

      /*
       * Try several common places where the Recruitee
       * job title may appear.
       */

      const titleCandidates =
        [];

      const titleTagMatch =
        recruiteeDecoded.match(
          /<title[^>]*>([\s\S]*?)<\/title>/i
        );

      if (
        titleTagMatch?.[1]
      ) {
        titleCandidates.push(
          titleTagMatch[1]
            .replace(
              /\s+/g,
              " "
            )
            .replace(
              /\s*[|–—-]\s*Recruitee.*$/i,
              ""
            )
            .trim()
        );
      }

      const ogTitleMatch =
        recruiteeDecoded.match(
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
        );

      if (
        ogTitleMatch?.[1]
      ) {
        titleCandidates.push(
          ogTitleMatch[1]
            .replace(
              /\s+/g,
              " "
            )
            .replace(
              /\s*[|–—-]\s*Recruitee.*$/i,
              ""
            )
            .trim()
        );
      }

      const h1Match =
        recruiteeDecoded.match(
          /<h1[^>]*>([\s\S]*?)<\/h1>/i
        );

      if (
        h1Match?.[1]
      ) {
        titleCandidates.push(
          h1Match[1]
            .replace(
              /<[^>]+>/g,
              " "
            )
            .replace(
              /\s+/g,
              " "
            )
            .trim()
        );
      }

      const sourceTitle =
        sourceJob.requestedTitle ||
        sourceJob.title ||
        "";

      const titleMatch =
        titleCandidates
          .filter(Boolean)
          .map(
            (title) => ({
              title,

              score:
                titleSimilarity(
                  sourceTitle,
                  title
                ),
            })
          )
          .sort(
            (a, b) =>
              b.score -
              a.score
          )[0];

      /*
       * Never accept an unrelated Recruitee job.
       */

      if (
        !titleMatch ||
        titleMatch.score <
          PROVIDER_MATCH_THRESHOLD
      ) {
        continue;
      }

      /*
       * =================================================
       * FIND DIRECT RECRUITEE APPLICATION FORM
       * =================================================
       *
       * Recruitee commonly exposes application forms
       * through /c/new.
       */

      const applicationUrls =
        new Set();

      const applicationRegex =
        /https?:\/\/[^\s"'<>\\]+\.recruitee\.com\/c\/new[^\s"'<>\\]*/gi;

      for (
        const match of recruiteeDecoded.matchAll(
          applicationRegex
        )
      ) {
        const applicationUrl =
          match[0]
            .replace(
              /[),.;]+$/,
              ""
            )
            .trim();

        if (
          isHttpUrl(
            applicationUrl
          )
        ) {
          applicationUrls.add(
            applicationUrl
          );
        }
      }

      /*
       * Also handle escaped /c/new URLs.
       */

      const escapedApplicationRegex =
        /https?:\\\/\\\/[^"'<>\\\s]+\.recruitee\.com\\\/c\\\/new[^"'<>\\\s]*/gi;

      for (
        const match of recruiteeDecoded.matchAll(
          escapedApplicationRegex
        )
      ) {
        const applicationUrl =
          match[0]
            .replace(
              /\\\//g,
              "/"
            )
            .replace(
              /[),.;]+$/,
              ""
            )
            .trim();

        if (
          isHttpUrl(
            applicationUrl
          )
        ) {
          applicationUrls.add(
            applicationUrl
          );
        }
      }

      /*
       * If a direct application form was actually exposed,
       * return it.
       */

      if (
        applicationUrls.size
      ) {
        const applicationUrl =
          [
            ...applicationUrls,
          ][0];

        return {
          provider:
            "recruitee",

          method:
            "recruitee-discovered-application-url",

          applicationUrl,

          matchedJob: {
            title:
              titleMatch.title,

            location:
              "",
          },

          score: {
            score:
              Math.max(
                PROVIDER_MATCH_THRESHOLD,
                titleMatch.score
              ),

            titleScore:
              titleMatch.score,

            locationScore:
              1,

            descriptionScore:
              0,

            salaryScore:
              1,

            identifierConfidence:
              1,
          },

          identifier:
            new URL(
              candidate.url
            ).hostname
              .replace(
                /\.recruitee\.com$/i,
                ""
              ),
        };
      }

      /*
       * If the verified Recruitee job page does not expose
       * the application form URL in its HTML, return the
       * verified employer ATS job page instead.
       *
       * We never invent /c/new.
       */

      return {
        provider:
          "recruitee",

        method:
          "recruitee-discovered-job-page",

        applicationUrl:
          candidate.url,

        matchedJob: {
          title:
            titleMatch.title,

          location:
            "",
        },

        score: {
          score:
            titleMatch.score,

          titleScore:
            titleMatch.score,

          locationScore:
            1,

          descriptionScore:
            0,

          salaryScore:
            1,

          identifierConfidence:
            1,
        },

        identifier:
          new URL(
            candidate.url
          ).hostname
            .replace(
              /\.recruitee\.com$/i,
              ""
            ),
      };
    } catch {
      continue;
    }
  }

  return null;
}
/*
 * =========================================================
 * DIRECT HIMALAYAS APPLY RESOLUTION
 * =========================================================
 *
 * NEW:
 *
 * This is intentionally separate from universal ATS
 * discovery.
 *
 * If Himalayas already gives us the actual external
 * application link, use that information instead of trying
 * to guess the employer's ATS board identifier.
 * =========================================================
 */

async function resolveFromHimalayasApplyLink(
  originalUrl
) {
  const html =
    await fetchHimalayasPageHtml(
      originalUrl
    );

  if (!html) {
    return null;
  }

  const direct =
    extractDirectHimalayasApplyLink(
      html
    );

  if (!direct) {
    return null;
  }

  return {
    provider:
      direct.provider,

    method:
      "himalayas-page-apply-link",

    applicationUrl:
      direct.url,

    matchedJob: null,

    score: {
      score:
        direct.score,

      titleScore:
        0,

      locationScore:
        0,

      descriptionScore:
        0,

      salaryScore:
        0,

      identifierConfidence:
        direct.score,
    },

    identifier:
      null,
  };
}


/*
 * =========================================================
 * UNIVERSAL ATS RESOLUTION
 * =========================================================
 */

async function resolveUniversal(
  sourceJob,
  companySlug
) {
  const identifiers =
    companyIdentifiers(
      sourceJob.company,
      companySlug
    );

  const providers = [
    {
      name:
        "greenhouse",

      resolve:
        resolveGreenhouse,
    },

    {
      name:
        "lever",

      resolve:
        resolveLever,
    },

    {
      name:
        "ashby",

      resolve:
        resolveAshby,
    },

    {
      name:
        "smartrecruiters",

      resolve:
        resolveSmartRecruiters,
    },

    {
      name:
        "workable",

      resolve:
        resolveWorkable,
    },

    {
      name:
        "recruitee",

      resolve:
        resolveRecruitee,
    },
  ];

  const results =
    await Promise.all(
      providers.map(
        async (provider) => {
          try {
            return await provider.resolve(
              sourceJob,
              identifiers
            );
          } catch (error) {
            console.error(
              `Provider ${provider.name} failed:`,
              error?.message ||
                "unknown error"
            );

            return null;
          }
        }
      )
    );

  const matches =
    results.filter(
      (result) =>
        result &&
        result.applicationUrl &&
        isHttpUrl(
          result.applicationUrl
        )
    );

  if (!matches.length) {
    return null;
  }

  matches.sort(
    (a, b) =>
      b.score.score -
      a.score.score
  );

  return matches[0];
}


/*
 * =========================================================
 * MAIN HANDLER
 * =========================================================
 */

export default async function handler(
  req,
  res
) {
  if (
    req.method ===
    "OPTIONS"
  ) {
    return sendJson(
      res,
      200,
      {}
    );
  }

  if (
    req.method !==
    "GET"
  ) {
    return sendJson(
      res,
      405,
      {
        error:
          "Method not allowed",
      }
    );
  }

  try {
    const originalUrl =
      req.query?.url;

    if (!originalUrl) {
      return sendJson(
        res,
        400,
        {
          error:
            "Missing url parameter",
        }
      );
    }

    if (
      !isHttpUrl(
        originalUrl
      )
    ) {
      return sendJson(
        res,
        400,
        {
          error:
            "Invalid URL",
        }
      );
    }

    if (
      !isHimalayasUrl(
        originalUrl
      )
    ) {
      return sendJson(
        res,
        400,
        {
          error:
            "Only Himalayas URLs are supported",
        }
      );
    }

    const slugData =
      extractHimalayasJob(
        originalUrl
      );

    if (!slugData) {
      return sendJson(
        res,
        200,
        {
          originalUrl,

          finalUrl:
            originalUrl,

          applyUrl:
            originalUrl,

          resolved:
            false,

          method:
            "fallback-invalid-himalayas-job-url",
        }
      );
    }


    /*
     * =====================================================
     * REQUEST OVERRIDES
     * =====================================================
     */

    const requestedTitle =
      req.query?.title ||
      slugData.requestedTitle;

    const requestedCompany =
      req.query?.company ||
      companyNameFromSlug(
        slugData.companySlug
      );


    /*
     * =====================================================
     * HIMALAYAS SOURCE LOOKUP
     * =====================================================
     */

    let himalayasJob = null;

    try {
      himalayasJob =
        await getHimalayasJob(
          slugData.companySlug,
          slugData.jobSlug,
          requestedTitle
        );
    } catch (error) {
      console.error(
        "Himalayas lookup failed:",
        error?.message ||
          "unknown error"
      );

      himalayasJob = null;
    }


    /*
     * =====================================================
     * BUILD SOURCE JOB
     * =====================================================
     */

    const sourceLookupAvailable =
      Boolean(
        himalayasJob
      );

    const sourceJob = {
      company:
        req.query?.company ||
        himalayasJob?.companyName ||
        requestedCompany ||
        "",

      title:
        req.query?.title ||
        himalayasJob?.title ||
        requestedTitle ||
        "",

      requestedTitle:
        requestedTitle ||
        "",

      companySlug:
        himalayasJob?.companySlug ||
        slugData.companySlug,

      description:
        himalayasJob?.description ||
        himalayasJob?.excerpt ||
        "",

      employmentType:
        req.query?.employmentType ||
        himalayasJob?.employmentType ||
        "",

      minSalary:
        numberValue(
          req.query?.minSalary ??
            himalayasJob?.minSalary
        ),

      maxSalary:
        numberValue(
          req.query?.maxSalary ??
            himalayasJob?.maxSalary
        ),

      currency:
        req.query?.currency ||
        himalayasJob?.currency ||
        "",

      salaryPeriod:
        req.query?.salaryPeriod ||
        himalayasJob?.salaryPeriod ||
        "",

      locationRestrictions:
        Array.isArray(
          himalayasJob?.locationRestrictions
        )
          ? himalayasJob.locationRestrictions
          : [],
    };


    /*
     * =====================================================
     * NEW STEP:
     *
     * TRY THE ACTUAL HIMALAYAS APPLY LINK FIRST.
     *
     * This is important because the job page can already
     * tell us the employer's actual ATS/application URL.
     * =====================================================
     */

    let directPageResolution = null;

    try {
      directPageResolution =
        await resolveFromHimalayasApplyLink(
          originalUrl
        );
    } catch (error) {
      console.error(
        "Himalayas Apply-link discovery failed:",
        error?.message ||
          "unknown error"
      );

      directPageResolution =
        null;
    }

    if (
      directPageResolution &&
      directPageResolution.applicationUrl
    ) {
      return sendJson(
        res,
        200,
        {
          originalUrl,

          finalUrl:
            directPageResolution.applicationUrl,

          applyUrl:
            directPageResolution.applicationUrl,

          resolved:
            true,

          provider:
            directPageResolution.provider,

          method:
            directPageResolution.method,

          matchedJob:
            directPageResolution.matchedJob,

          matchScore:
            Number(
              directPageResolution.score.score.toFixed(
                3
              )
            ),

          matchEvidence: {
            titleScore:
              Number(
                directPageResolution.score.titleScore.toFixed(
                  3
                )
              ),

            locationScore:
              Number(
                directPageResolution.score.locationScore.toFixed(
                  3
                )
              ),

            descriptionScore:
              Number(
                directPageResolution.score.descriptionScore.toFixed(
                  3
                )
              ),

            salaryScore:
              Number(
                directPageResolution.score.salaryScore.toFixed(
                  3
                )
              ),

            identifierConfidence:
              Number(
                (
                  directPageResolution
                    .score
                    .identifierConfidence ??
                  0
                ).toFixed(3)
              ),
          },

          source: {
            company:
              sourceJob.company,

            title:
              sourceJob.title,

            requestedTitle:
              sourceJob.requestedTitle,

            employmentType:
              sourceJob.employmentType,

            minSalary:
              sourceJob.minSalary,

            maxSalary:
              sourceJob.maxSalary,

            currency:
              sourceJob.currency,

            salaryPeriod:
              sourceJob.salaryPeriod,

            himalayasLookup:
              sourceLookupAvailable,

            himalayasApplyLink:
              true,
          },
        }
      );
    }


    /*
     * =====================================================
     * UNIVERSAL ATS RESOLUTION
     * =====================================================
     */

    const resolved =
      await resolveUniversal(
        sourceJob,
        sourceJob.companySlug
      );

    if (
      resolved &&
      resolved.applicationUrl
    ) {
      return sendJson(
        res,
        200,
        {
          originalUrl,

          finalUrl:
            resolved.applicationUrl,

          applyUrl:
            resolved.applicationUrl,

          resolved:
            true,

          provider:
            resolved.provider,

          method:
            resolved.method,

          matchedJob:
            resolved.matchedJob,

          matchScore:
            Number(
              resolved.score.score.toFixed(
                3
              )
            ),

          matchEvidence: {
            titleScore:
              Number(
                resolved.score.titleScore.toFixed(
                  3
                )
              ),

            locationScore:
              Number(
                resolved.score.locationScore.toFixed(
                  3
                )
              ),

            descriptionScore:
              Number(
                resolved.score.descriptionScore.toFixed(
                  3
                )
              ),

            salaryScore:
              Number(
                resolved.score.salaryScore.toFixed(
                  3
                )
              ),

            identifierConfidence:
              Number(
                (
                  resolved.score
                    .identifierConfidence ??
                  0
                ).toFixed(3)
              ),
          },

          source: {
            company:
              sourceJob.company,

            title:
              sourceJob.title,

            requestedTitle:
              sourceJob.requestedTitle,

            employmentType:
              sourceJob.employmentType,

            minSalary:
              sourceJob.minSalary,

            maxSalary:
              sourceJob.maxSalary,

            currency:
              sourceJob.currency,

            salaryPeriod:
              sourceJob.salaryPeriod,

            himalayasLookup:
              sourceLookupAvailable,

            himalayasApplyLink:
              false,
          },
        }
      );
    }


    /*
     * =====================================================
     * SAFE FALLBACK
     * =====================================================
     */

    return sendJson(
      res,
      200,
      {
        originalUrl,

        finalUrl:
          originalUrl,

        applyUrl:
          originalUrl,

        resolved:
          false,

        method:
          "fallback-no-verified-ats-match",

        source: {
          company:
            sourceJob.company,

          title:
            sourceJob.title,

          requestedTitle:
            sourceJob.requestedTitle,

          employmentType:
            sourceJob.employmentType,

          minSalary:
            sourceJob.minSalary,

          maxSalary:
            sourceJob.maxSalary,

          currency:
            sourceJob.currency,

          salaryPeriod:
            sourceJob.salaryPeriod,

          himalayasLookup:
            sourceLookupAvailable,

          himalayasApplyLink:
            false,
        },

        checkedProviders: [
          "himalayas-page-apply-link",
          "greenhouse",
          "lever",
          "ashby",
          "smartrecruiters",
          "workable",
          "recruitee",
        ],
      }
    );
  } catch (error) {
    console.error(
      "Universal resolver error:",
      error
    );

    return sendJson(
      res,
      500,
      {
        error:
          "Universal resolver failed",

        message:
          error?.message ||
          "Unknown resolver error",
      }
    );
  }
}
