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
 * LAUNCH FLOW
 *
 * Himalayas Job
 *      ↓
 * Extract company + title
 *      ↓
 * Himalayas source lookup
 *      ↓
 * Discover Greenhouse application evidence
 *      ↓
 * Build Greenhouse board identifiers
 *      ↓
 * Greenhouse public board API
 *      ↓
 * Verify exact job where possible
 *      ↓
 * Score returned Greenhouse jobs
 *      ↓
 * Verified Greenhouse job?
 *      ↓                 ↓
 *     YES               NO
 *      ↓                 ↓
 * Greenhouse URL       resolved:false
 *
 *
 * IMPORTANT
 *
 * - Greenhouse is the ONLY enabled provider.
 * - No Lever.
 * - No Ashby.
 * - No SmartRecruiters.
 * - No Workable.
 * - No Recruitee.
 * - No Himalayas fallback application URL.
 * - No guessed application URLs.
 * - No hardcoded company job IDs.
 * - Greenhouse URL must come from Greenhouse's API.
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

const MAX_COMPANY_IDENTIFIERS = 12;

/*
 * Controlled Greenhouse retry/search depth.
 *
 * Greenhouse's public Job Board API returns the published
 * jobs for a board. These extra attempts are defensive and
 * mainly help when a board response behaves differently
 * across environments.
 */
const GREENHOUSE_MAX_PAGES = 3;


/*
 * =========================================================
 * ENABLED PROVIDERS
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
 * GREENHOUSE URL VALIDATION
 * =========================================================
 */

function isGreenhouseUrl(value) {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const hostname = new URL(value)
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
 * GREENHOUSE LINK EXTRACTION
 * =========================================================
 *
 * IMPORTANT:
 *
 * We do NOT return a Himalayas applicationLink directly.
 *
 * We only use a Greenhouse applicationLink as evidence to
 * identify the Greenhouse board token and, when available,
 * the exact Greenhouse job ID.
 *
 * The final URL still has to come from Greenhouse's API.
 * =========================================================
 */

function extractGreenhouseApplicationEvidence(
  applicationLink = ""
) {
  if (!isGreenhouseUrl(applicationLink)) {
    return null;
  }

  try {
    const parsed = new URL(applicationLink);

    const hostname =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    const pathParts =
      parsed.pathname
        .split("/")
        .filter(Boolean)
        .map((part) =>
          decodeURIComponent(part)
        );

    let boardToken = "";
    let jobId = "";

    /*
     * Standard Greenhouse hosted board:
     *
     * boards.greenhouse.io/company/jobs/123
     *
     * job-boards.greenhouse.io/company/jobs/123
     */

    if (
      hostname === "boards.greenhouse.io" ||
      hostname === "job-boards.greenhouse.io"
    ) {
      const jobsIndex =
        pathParts.findIndex(
          (part) =>
            part.toLowerCase() === "jobs"
        );

      if (
        jobsIndex > 0
      ) {
        boardToken =
          pathParts[jobsIndex - 1] || "";

        jobId =
          pathParts[jobsIndex + 1] || "";
      }
    }

    /*
     * Greenhouse-powered external careers pages can use:
     *
     * ?gh_jid=123456
     */

    if (!jobId) {
      jobId =
        parsed.searchParams.get(
          "gh_jid"
        ) ||
        parsed.searchParams.get(
          "gh_jid"
        ) ||
        "";
    }

    /*
     * Some Greenhouse URLs expose the board token in the
     * path even when the exact /jobs/ structure differs.
     */

    if (
      !boardToken &&
      pathParts.length >= 1
    ) {
      const possibleJobsIndex =
        pathParts.findIndex(
          (part) =>
            part.toLowerCase() === "jobs"
        );

      if (
        possibleJobsIndex > 0
      ) {
        boardToken =
          pathParts[
            possibleJobsIndex - 1
          ] || "";
      }
    }

    return {
      applicationLink:
        applicationLink.trim(),

      boardToken:
        boardToken.trim(),

      jobId:
        String(jobId || "").trim(),
    };
  } catch {
    return null;
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


/*
 * =========================================================
 * TITLE NORMALIZATION
 * =========================================================
 *
 * IMPORTANT CHANGE:
 *
 * Software Engineer I
 * Software Engineer 1
 *
 * now normalize to the same representation.
 *
 * This helps titles where Greenhouse/Himalayas use
 * different numbering conventions.
 * =========================================================
 */

function normalizeTitle(value = "") {
  let title =
    normalize(value)
      .replace(
        /\b(full time|fulltime|part time|parttime|remote|hybrid|onsite|on site)\b/g,
        " "
      );

  /*
   * Roman numeral job levels.
   *
   * Only convert standalone level numerals so we don't
   * accidentally modify ordinary words.
   */

  title =
    title
      .replace(
        /\b(viii|vii|vi|iv|iii|ii|i)\b/gi,
        (match) => {
          const map = {
            i: "1",
            ii: "2",
            iii: "3",
            iv: "4",
            v: "5",
            vi: "6",
            vii: "7",
            viii: "8",
          };

          return (
            map[
              match.toLowerCase()
            ] || match
          );
        }
      );

  return title
    .replace(
      /[^a-z0-9\s]+/g,
      " "
    )
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
 * HIMALAYAS JOB TITLE FROM SLUG
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
 * STOP WORDS
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


/*
 * =========================================================
 * TOKEN / JACCARD SIMILARITY
 * =========================================================
 */

function tokenSet(value = "") {
  return new Set(
    normalizeTitle(value)
      .split(/\s+/)
      .map((word) =>
        word.replace(
          /[^a-z0-9]/g,
          ""
        )
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

  const firstTokens =
    tokenSet(first);

  const secondTokens =
    tokenSet(second);

  /*
   * Strong containment rule.
   *
   * Example:
   * "Staff Backend Software Engineer"
   * vs
   * "Staff Backend Software Engineer II"
   *
   * should remain a very strong match.
   */

  let shared = 0;

  for (const token of firstTokens) {
    if (
      secondTokens.has(token)
    ) {
      shared++;
    }
  }

  const smallerSize =
    Math.min(
      firstTokens.size,
      secondTokens.size
    );

  if (
    smallerSize >= 2 &&
    shared === smallerSize
  ) {
    return 0.95;
  }

  return jaccardSimilarity(
    first,
    second
  );
}


/*
 * =========================================================
 * JOB SLUG MATCHING
 * =========================================================
 */

function cleanRequestedJobSlug(jobSlug = "") {
  return slugify(
    String(jobSlug || "")
      .replace(
        /[-_]+\d{4,}$/g,
        ""
      )
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

  if (
    titleSlug === requestedSlug
  ) {
    return 1;
  }

  return jaccardSimilarity(
    requestedSlug.replace(
      /-/g,
      " "
    ),
    titleSlug.replace(
      /-/g,
      " "
    )
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
    normalizeTitle(
      requestedTitle
    );

  const normalizedJob =
    normalizeTitle(
      job.title || ""
    );

  if (
    normalizedRequested &&
    normalizedRequested ===
      normalizedJob
  ) {
    return true;
  }

  const requestedSlug =
    cleanRequestedJobSlug(
      requestedJobSlug
    );

  const jobTitleSlug =
    slugify(
      job.title || ""
    );

  return (
    requestedSlug &&
    jobTitleSlug &&
    requestedSlug ===
      jobTitleSlug
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

  for (const restriction of restrictions) {
    if (
      restriction &&
      location.includes(
        restriction
      )
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
 * HIMALAYAS SEARCH
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
 * GREENHOUSE COMPANY IDENTIFIERS
 * =========================================================
 */

function companyIdentifiers(
  companyName,
  companySlug,
  greenhouseBoardToken = ""
) {
  const values = [];

  function add(value) {
    if (!value) {
      return;
    }

    const cleaned =
      String(value)
        .trim()
        .toLowerCase()
        .replace(
          /^[-_]+|[-_]+$/g,
          ""
        );

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


  /*
   * IMPORTANT:
   *
   * If Himalayas already gave us a Greenhouse board token,
   * put it FIRST.
   *
   * This is now the strongest board identifier because it
   * came from an actual Greenhouse application destination.
   */

  add(
    greenhouseBoardToken
  );


  const rawSlug =
    String(
      companySlug ||
      ""
    )
      .trim()
      .toLowerCase();


  const rawName =
    String(
      companyName ||
      ""
    )
      .trim()
      .toLowerCase();


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


  /*
   * Original identifiers
   */

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


  /*
   * Raw company slug
   */

  add(
    rawSlug
  );


  /*
   * Strip common corporate suffixes.
   */

  const withoutCompanySuffix =
    canonicalSlug
      .replace(
        /-(inc|llc|ltd|limited|corp|corporation|company|co|plc)$/i,
        ""
      );

  add(
    withoutCompanySuffix
  );


  /*
   * Himalayas "-com" company slugs.
   */

  const withoutComSuffix =
    canonicalSlug
      .replace(
        /-com$/i,
        ""
      );

  add(
    withoutComSuffix
  );


  /*
   * Literal ".com".
   */

  const withoutDotCom =
    rawSlug
      .replace(
        /\.com$/i,
        ""
      );

  add(
    withoutDotCom
  );


  /*
   * Company-name tokens.
   */

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


  /*
   * Remove obvious corporate words.
   */

  const filtered =
    values.filter(
      (value) =>
        ![
          "inc",
          "llc",
          "ltd",
          "limited",
          "corp",
          "corporation",
          "company",
          "co",
          "plc",
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


  /*
   * A Greenhouse job must first be a reasonably strong
   * title match.
   */

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


  /*
   * CHANGE:
   *
   * Missing provider location is now neutral when the
   * source job itself has no explicit restrictions.
   */

  const locationScore =
    sourceRestrictions.length
      ? 1
      : 0.5;


  /*
   * CHANGE:
   *
   * Missing description remains neutral instead of
   * destroying a strong title match.
   */

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
 * GREENHOUSE JOB ID HELPERS
 * =========================================================
 */

function normalizeGreenhouseJobId(
  value
) {
  const cleaned =
    String(
      value ?? ""
    ).trim();

  return /^\d+$/.test(
    cleaned
  )
    ? cleaned
    : "";
}


function greenhouseJobIdsMatch(
  job,
  requestedJobId
) {
  const wanted =
    normalizeGreenhouseJobId(
      requestedJobId
    );

  if (!wanted || !job) {
    return false;
  }

  const apiId =
    normalizeGreenhouseJobId(
      job.id
    );

  const internalId =
    normalizeGreenhouseJobId(
      job.internal_job_id
    );

  if (
    apiId &&
    apiId === wanted
  ) {
    return true;
  }

  if (
    internalId &&
    internalId === wanted
  ) {
    return true;
  }

  const absoluteUrl =
    String(
      job.absolute_url || ""
    );

  if (
    absoluteUrl
  ) {
    try {
      const parsed =
        new URL(
          absoluteUrl
        );

      const ghJid =
        normalizeGreenhouseJobId(
          parsed.searchParams.get(
            "gh_jid"
          )
        );

      if (
        ghJid &&
        ghJid === wanted
      ) {
        return true;
      }

      const pathMatch =
        parsed.pathname.match(
          /\/jobs\/(\d+)/i
        );

      if (
        pathMatch &&
        normalizeGreenhouseJobId(
          pathMatch[1]
        ) === wanted
      ) {
        return true;
      }
    } catch {
      /*
       * Ignore malformed candidate URLs.
       */
    }
  }

  return false;
}


/*
 * =========================================================
 * GREENHOUSE JOB FETCH
 * =========================================================
 *
 * Greenhouse documents this endpoint as returning the
 * published jobs for a board.
 *
 * We keep the normal request first.
 *
 * Additional page attempts are defensive only and are
 * deduplicated by job ID.
 * =========================================================
 */

async function fetchGreenhouseJobs(
  identifier
) {
  const allJobs = [];

  const seenIds =
    new Set();

  for (
    let page = 1;
    page <= GREENHOUSE_MAX_PAGES;
    page++
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "content",
      "true"
    );

    /*
     * Page is included only for defensive compatibility.
     * If Greenhouse ignores it, the duplicate jobs are
     * removed below.
     */

    if (
      page > 1
    ) {
      params.set(
        "page",
        String(page)
      );
    }

    const endpoint =
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
        identifier
      )}/jobs?${params.toString()}`;


    const result =
      await fetchJson(
        endpoint,
        {},
        6000,
        1
      );


    if (
      !result.ok ||
      !result.data ||
      !Array.isArray(
        result.data.jobs
      )
    ) {
      /*
       * If the first request itself failed, there is no
       * Greenhouse board under this identifier.
       */

      if (
        page === 1
      ) {
        return [];
      }

      break;
    }


    const jobs =
      result.data.jobs;


    let addedThisPage = 0;


    for (
      const job
      of jobs
    ) {
      if (!job) {
        continue;
      }

      const identity =
        String(
          job.id ??
          job.absolute_url ??
          `${job.title}:${job.updated_at || ""}`
        );

      if (
        seenIds.has(
          identity
        )
      ) {
        continue;
      }

      seenIds.add(
        identity
      );

      allJobs.push(
        job
      );

      addedThisPage++;
    }


    /*
     * The normal Greenhouse response is already the complete
     * published-job list. If a page request returns no new
     * jobs, stop.
     */

    if (
      !jobs.length ||
      addedThisPage === 0
    ) {
      break;
    }


    /*
     * If Greenhouse exposes a total count and we've already
     * reached it, stop.
     */

    const total =
      numberValue(
        result.data?.meta?.total
      );

    if (
      total !== null &&
      allJobs.length >= total
    ) {
      break;
    }


    /*
     * Normal non-paginated response: the first response is
     * already the board's full list.
     *
     * Only continue to the defensive page attempt if the
     * response looks like a large list.
     */

    if (
      page === 1 &&
      jobs.length < 100
    ) {
      break;
    }
  }

  return allJobs;
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
  /*
   * If Himalayas supplied a Greenhouse application link,
   * use its exact job ID as high-confidence evidence.
   */

  const requestedGreenhouseJobId =
    normalizeGreenhouseJobId(
      sourceJob.greenhouseJobId
    );


  const attempts =
    identifiers.map(
      async (identifier) => {
        const jobs =
          await fetchGreenhouseJobs(
            identifier
          );


        if (
          !jobs.length
        ) {
          return null;
        }


        let best = null;


        /*
         * ===================================================
         * PASS 1
         *
         * Exact Greenhouse job ID match.
         *
         * This is the strongest possible match when the
         * Himalayas listing already supplied a Greenhouse
         * application destination.
         * ===================================================
         */

        if (
          requestedGreenhouseJobId
        ) {
          for (
            const job
            of jobs
          ) {
            if (
              !greenhouseJobIdsMatch(
                job,
                requestedGreenhouseJobId
              )
            ) {
              continue;
            }


            const candidate = {
              title:
                job.title || "",

              location:
                job.location?.name ||
                "",

              description:
                job.content ||
                job.description ||
                "",

              minSalary:
                null,

              maxSalary:
                null,
            };


            const normalizedIdentifier =
              normalizeCompany(
                identifier
              );


            const normalizedCompanySlug =
              normalizeCompany(
                sourceJob.companySlug ||
                  ""
              );


            const normalizedCompany =
              normalizeCompany(
                sourceJob.company ||
                  ""
              );


            const identifierConfidence =
              normalizedIdentifier ===
                normalizedCompanySlug ||
              normalizedIdentifier ===
                normalizedCompany
                ? 1
                : 0.9;


            const score =
              scoreProviderJob(
                sourceJob,

                candidate,

                identifierConfidence
              );


            /*
             * Exact ID match gets a very strong bonus,
             * but we still require the title/location
             * verification rules.
             */

            if (
              score.score >=
              PROVIDER_MATCH_THRESHOLD
            ) {
              best = {
                score,

                job,

                identifier,

                exactGreenhouseIdMatch:
                  true,
              };

              break;
            }
          }
        }


        /*
         * ===================================================
         * PASS 2
         *
         * Normal title/location/description scoring.
         * ===================================================
         */

        for (
          const job
          of jobs
        ) {
          if (!job) {
            continue;
          }


          const candidate = {
            title:
              job.title || "",

            location:
              job.location?.name ||
              "",

            description:
              job.content ||
              job.description ||
              "",

            minSalary:
              null,

            maxSalary:
              null,
          };


          const normalizedIdentifier =
            normalizeCompany(
              identifier
            );


          const normalizedCompanySlug =
            normalizeCompany(
              sourceJob.companySlug ||
                ""
            );


          const normalizedCompany =
            normalizeCompany(
              sourceJob.company ||
                ""
            );


          const identifierConfidence =
            normalizedIdentifier ===
              normalizedCompanySlug ||
            normalizedIdentifier ===
              normalizedCompany
              ? 1
              : 0.9;


          const score =
            scoreProviderJob(
              sourceJob,

              candidate,

              identifierConfidence
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

              exactGreenhouseIdMatch:
                false,
            };
          }
        }


        if (!best) {
          return null;
        }


        /*
         * ===================================================
         * GREENHOUSE ABSOLUTE URL
         * ===================================================
         *
         * This MUST come directly from the Greenhouse API.
         * ===================================================
         */

        const applicationUrl =
          typeof best.job.absolute_url ===
            "string"
            ? best.job.absolute_url.trim()
            : "";


        if (
          !applicationUrl
        ) {
          return null;
        }


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
            best.exactGreenhouseIdMatch
              ? "greenhouse-exact-job-verification"
              : "greenhouse-public-job-board-api",

          applicationUrl,

          matchedJob: {
            title:
              best.job.title ||
              "",

            location:
              best.job.location?.name ||
              "",
          },

          score:
            best.score,

          identifier:
            best.identifier,

          exactGreenhouseIdMatch:
            best.exactGreenhouseIdMatch,
        };
      }
    );


  const results =
    await Promise.all(
      attempts
    );


  const validResults =
    results
      .filter(Boolean)
      .filter(
        (result) =>
          result.provider ===
            "greenhouse" &&
          result.applicationUrl &&
          isGreenhouseUrl(
            result.applicationUrl
          )
      );


  if (
    !validResults.length
  ) {
    return null;
  }


  validResults.sort(
    (a, b) => {
      /*
       * Exact Greenhouse job-ID verification wins over
       * ordinary similarity when both are valid.
       */

      if (
        a.exactGreenhouseIdMatch &&
        !b.exactGreenhouseIdMatch
      ) {
        return -1;
      }

      if (
        !a.exactGreenhouseIdMatch &&
        b.exactGreenhouseIdMatch
      ) {
        return 1;
      }

      return (
        b.score.score -
        a.score.score
      );
    }
  );


  return validResults[0];
}


/*
 * =========================================================
 * GREENHOUSE-ONLY RESOLUTION
 * =========================================================
 */

async function resolveUniversal(
  sourceJob,
  companySlug
) {
  const identifiers =
    companyIdentifiers(
      sourceJob.company,

      companySlug,

      sourceJob.greenhouseBoardToken
    );


  console.log(
    "Greenhouse board identifiers:",
    identifiers
  );


  if (
    !identifiers.length
  ) {
    return null;
  }


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
    (a, b) => {
      if (
        a.exactGreenhouseIdMatch &&
        !b.exactGreenhouseIdMatch
      ) {
        return -1;
      }

      if (
        !a.exactGreenhouseIdMatch &&
        b.exactGreenhouseIdMatch
      ) {
        return 1;
      }

      return (
        b.score.score -
        a.score.score
      );
    }
  );


  return matches[0];
}


/*
 * =========================================================
 * RESOLVED RESPONSE
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

      greenhouseEvidence:
        sourceJob.greenhouseBoardToken
          ? {
              boardToken:
                sourceJob.greenhouseBoardToken,

              jobId:
                sourceJob.greenhouseJobId ||
                null,
            }
          : null,
    },

    checkedProviders: [
      "greenhouse",
    ],
  };
}


/*
 * =========================================================
 * UNRESOLVED RESPONSE
 * =========================================================
 */

function buildUnresolvedResponse(
  originalUrl,
  sourceJob,
  sourceLookupAvailable,
  method =
    "greenhouse-no-verified-match"
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

      greenhouseEvidence:
        sourceJob.greenhouseBoardToken
          ? {
              boardToken:
                sourceJob.greenhouseBoardToken,

              jobId:
                sourceJob.greenhouseJobId ||
                null,
            }
          : null,
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
   * GET ONLY
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
     * URL PARAMETER
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
     * HIMALAYAS ONLY
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
     * PARSE HIMALAYAS JOB
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
     * OPTIONAL REQUEST OVERRIDES
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


    const sourceLookupAvailable =
      Boolean(
        himalayasJob
      );


    /*
     * =====================================================
     * GREENHOUSE APPLICATION EVIDENCE
     * =====================================================
     *
     * IMPORTANT CHANGE:
     *
     * We now preserve and inspect Himalayas'
     * applicationLink.
     *
     * If that link is Greenhouse, it is NOT returned
     * directly.
     *
     * It is only used to discover:
     *
     * - Greenhouse board token
     * - Greenhouse job ID
     *
     * Greenhouse API must still verify the job.
     * =====================================================
     */

    const greenhouseEvidence =
      extractGreenhouseApplicationEvidence(
        himalayasJob?.applicationLink ||
        himalayasJob?.applicationUrl ||
        ""
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

      /*
       * NEW:
       * Greenhouse evidence extracted from Himalayas.
       */

      greenhouseBoardToken:
        greenhouseEvidence?.boardToken ||
        "",

      greenhouseJobId:
        greenhouseEvidence?.jobId ||
        "",

      greenhouseApplicationLink:
        greenhouseEvidence?.applicationLink ||
        "",
    };


    /*
     * =====================================================
     * GREENHOUSE ONLY
     * =====================================================
     *
     * There is deliberately NO general ATS fallback.
     *
     * Every accepted job must be verified by the
     * Greenhouse public board API.
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
