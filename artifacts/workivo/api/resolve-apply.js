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
 * WORKIVO GREENHOUSE-VERIFIED APPLICATION RESOLVER
 * =========================================================
 *
 * LAUNCH RULE
 *
 * Himalayas Job
 *      ↓
 * Extract company + title
 *      ↓
 * Himalayas source lookup when available
 *      ↓
 * Greenhouse verification
 *      ↓
 * ┌───────────────────────────────┐
 * │ Greenhouse verified match?    │
 * └───────────────────────────────┘
 *          ↓                 ↓
 *         YES               NO
 *          ↓                 ↓
 * Greenhouse URL       resolved:false
 *                      applyUrl:null
 *
 * IMPORTANT
 *
 * - Greenhouse is the ONLY enabled provider at launch.
 * - Other ATS providers are intentionally disabled.
 * - No Himalayas fallback application URL is returned.
 * - No arbitrary external links are accepted.
 * - No company-specific job IDs are hardcoded.
 * - No company-specific application URLs are hardcoded.
 * - Greenhouse matching procedure is preserved.
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
 * LAUNCH PROVIDER CONFIGURATION
 * =========================================================
 *
 * Greenhouse is the ONLY provider enabled for launch.
 *
 * Future providers can be added later without changing
 * the overall resolver architecture.
 *
 * Example later:
 *
 * const ENABLED_PROVIDERS = [
 *   "greenhouse",
 *   "ashby",
 * ];
 *
 * But for launch we intentionally keep this Greenhouse-only.
 * =========================================================
 */

const ENABLED_PROVIDERS = [
  "greenhouse",
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
 * GREENHOUSE URL VERIFICATION
 * =========================================================
 *
 * We only accept actual Greenhouse application URLs.
 *
 * This prevents a Greenhouse resolver result from
 * accidentally returning an unrelated external URL.
 * =========================================================
 */

function isGreenhouseUrl(value) {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const hostname =
      new URL(value)
        .hostname
        .toLowerCase()
        .replace(/^www\./, "");

    return (
      hostname === "greenhouse.io" ||
      hostname.endsWith(".greenhouse.io") ||
      hostname === "greenhouse.com" ||
      hostname.endsWith(".greenhouse.com")
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

  return jaccardSimilarity(
    first,
    second
  );
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

function jobSlugSimilarity(
  requestedJobSlug = "",
  job = {}
) {
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
    numberValue(
      sourceJob.minSalary
    );

  const sourceMax =
    numberValue(
      sourceJob.maxSalary
    );

  const providerMin =
    numberValue(
      providerJob.minSalary
    );

  const providerMax =
    numberValue(
      providerJob.maxSalary
    );

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
    score: Math.min(
      score,
      1
    ),

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
      !values.includes(
        cleaned
      )
    ) {
      values.push(
        cleaned
      );
    }
  }

  add(
    requestedTitle
  );

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
    tokenSet(
      requestedTitle
    );

  if (
    tokens.size >= 2
  ) {
    add(
      Array.from(tokens)
        .slice(0, 4)
        .join(" ")
    );
  }

  return values.slice(
    0,
    3
  );
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
    titleFromJobSlug(
      jobSlug
    );

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
    if (
      !Array.isArray(
        jobs
      )
    ) {
      return;
    }

    for (
      const job
      of jobs
    ) {
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
        seen.has(
          identity
        )
      ) {
        continue;
      }

      seen.add(
        identity
      );

      allCandidates.push(
        job
      );
    }
  }

  function findExact(
    jobs
  ) {
    if (
      !Array.isArray(
        jobs
      )
    ) {
      return null;
    }

    for (
      const job
      of jobs
    ) {
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
        findExact(
          jobs
        );

      if (exact) {
        return exact;
      }

      collectJobs(
        jobs
      );

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
          page *
            responseLimit >=
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
      findExact(
        jobs
      );

    if (exact) {
      return exact;
    }

    collectJobs(
      jobs
    );

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
        page *
          responseLimit >=
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
    of titleQueries.slice(
      0,
      2
    )
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
        findExact(
          jobs
        );

      if (exact) {
        return exact;
      }

      collectJobs(
        jobs
      );

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

  if (
    !allCandidates.length
  ) {
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
      !values.includes(
        cleaned
      )
    ) {
      values.push(
        cleaned
      );
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

  add(
    canonicalSlug
  );

  add(
    nameSlug
  );

  add(
    compactSlug
  );

  add(
    compactName
  );

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
    add(
      token
    );
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
        ].includes(
          value
        )
    );

  return filtered.slice(
    0,
    MAX_COMPANY_IDENTIFIERS
  );
}


/*
 * =========================================================
 * PROVIDER MATCH SCORING
 * =========================================================
 *
 * THIS IS THE SAME MATCHING MODEL USED BY THE WORKING
 * GREENHOUSE PROCEDURE.
 *
 * We are deliberately not changing it.
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
 *
 * IMPORTANT:
 *
 * This is the existing working Greenhouse procedure.
 *
 * The public Greenhouse Board API is used to search the
 * company's jobs and then the strongest verified matching
 * job is returned.
 *
 * DO NOT replace this with guessed URLs.
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

        /*
         * EXTRA SAFETY:
         *
         * Even though Greenhouse's API supplies this URL,
         * verify that it is actually a Greenhouse URL.
         */

        if (
          !isGreenhouseUrl(
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
 * GREENHOUSE-ONLY UNIVERSAL RESOLUTION
 * =========================================================
 *
 * The architecture is still called "universal" internally
 * so that future providers can be added cleanly.
 *
 * BUT:
 *
 * ENABLED_PROVIDERS = ["greenhouse"]
 *
 * Therefore no other ATS is called at launch.
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

  const providers = [];

  if (
    ENABLED_PROVIDERS.includes(
      "greenhouse"
    )
  ) {
    providers.push({
      name:
        "greenhouse",

      resolve:
        resolveGreenhouse,
    });
  }

  /*
   * Other providers intentionally disabled.
   *
   * They are NOT called.
   *
   * Future examples:
   *
   * if (ENABLED_PROVIDERS.includes("ashby")) {
   *   providers.push({
   *     name: "ashby",
   *     resolve: resolveAshby,
   *   });
   * }
   */

  if (
    !providers.length
  ) {
    return null;
  }

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

        result.provider ===
          "greenhouse" &&

        result.applicationUrl &&

        isHttpUrl(
          result.applicationUrl
        ) &&

        isGreenhouseUrl(
          result.applicationUrl
        )
    );

  if (
    !matches.length
  ) {
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
 * RESPONSE FORMAT HELPERS
 * =========================================================
 */

function buildResolvedResponse(
  originalUrl,
  resolved,
  sourceJob,
  sourceLookupAvailable
) {
  return {
    originalUrl,

    finalUrl:
      resolved.applicationUrl,

    applyUrl:
      resolved.applicationUrl,

    resolved:
      true,

    provider:
      "greenhouse",

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
          ).toFixed(
            3
          )
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

      greenhouseVerification:
        true,
    },
  };
}


/*
 * =========================================================
 * UNRESOLVED RESPONSE
 * =========================================================
 *
 * IMPORTANT CHANGE:
 *
 * We NO LONGER return the Himalayas URL as applyUrl.
 *
 * This makes it impossible for the resolver to accidentally
 * treat an unverified Himalayas listing as a verified
 * application destination.
 *
 * Dashboard/batch logic should keep ONLY:
 *
 * resolved === true
 *
 * =========================================================
 */

function buildUnresolvedResponse(
  originalUrl,
  sourceJob,
  sourceLookupAvailable,
  method = "greenhouse-no-verified-match"
) {
  return {
    originalUrl,

    finalUrl:
      null,

    applyUrl:
      null,

    resolved:
      false,

    provider:
      null,

    method,

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

      greenhouseVerification:
        false,
    },

    checkedProviders: [
      "greenhouse",
    ],
  };
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
  /*
   * OPTIONS
   */

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


  /*
   * ONLY GET
   */

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
    /*
     * =====================================================
     * GET URL
     * =====================================================
     */

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


    /*
     * =====================================================
     * VALIDATE URL
     * =====================================================
     */

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


    /*
     * =====================================================
     * ONLY HIMALAYAS INPUTS
     * =====================================================
     */

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


    /*
     * =====================================================
     * PARSE HIMALAYAS JOB URL
     * =====================================================
     */

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
            null,

          applyUrl:
            null,

          resolved:
            false,

          provider:
            null,

          method:
            "fallback-invalid-himalayas-job-url",

          checkedProviders: [
            "greenhouse",
          ],
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
     *
     * This is still useful because it gives Greenhouse
     * more accurate title/company/location information.
     *
     * HOWEVER:
     *
     * Greenhouse resolution continues even if this lookup
     * fails.
     * =====================================================
     */

    let himalayasJob =
      null;

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

      himalayasJob =
        null;
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
      url:
        originalUrl,

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
     * GREENHOUSE-ONLY RESOLUTION
     * =====================================================
     *
     * No direct Himalayas Apply-link shortcut.
     *
     * Why?
     *
     * The new launch rule says Workivo must verify the job
     * through Greenhouse.
     *
     * Therefore even if Himalayas exposes some other ATS
     * link, we do NOT accept it.
     * =====================================================
     */

    let resolved =
      null;

    try {
      resolved =
        await resolveUniversal(
          sourceJob,

          sourceJob.companySlug
        );
    } catch (error) {
      console.error(
        "Greenhouse resolver failed:",

        error?.message ||
          "unknown error"
      );

      resolved =
        null;
    }


    /*
     * =====================================================
     * VERIFIED GREENHOUSE MATCH
     * =====================================================
     */

    if (
      resolved &&
      resolved.provider ===
        "greenhouse" &&
      resolved.applicationUrl &&
      isGreenhouseUrl(
        resolved.applicationUrl
      )
    ) {
      return sendJson(
        res,
        200,

        buildResolvedResponse(
          originalUrl,

          resolved,

          sourceJob,

          sourceLookupAvailable
        )
      );
    }


    /*
     * =====================================================
     * NO VERIFIED GREENHOUSE MATCH
     * =====================================================
     *
     * DO NOT return the Himalayas URL.
     *
     * This job must be dropped by the batch consumer.
     * =====================================================
     */

    return sendJson(
      res,
      200,

      buildUnresolvedResponse(
        originalUrl,

        sourceJob,

        sourceLookupAvailable
      )
    );
  } catch (error) {
    console.error(
      "Greenhouse resolver error:",
      error
    );

    return sendJson(
      res,
      500,
      {
        error:
          "Greenhouse resolver failed",

        message:
          error?.message ||
          "Unknown resolver error",
      }
    );
  }
}
