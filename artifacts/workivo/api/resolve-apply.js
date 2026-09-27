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
 * PURPOSE
 *
 * Himalayas job URL
 *      ↓
 * Robust Himalayas source-job discovery
 *      ↓
 * Preserve URL-derived title + API title
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
 * No company-specific job IDs.
 * No company-specific application URLs.
 * No hardcoded employer mappings.
 * No invented URLs.
 *
 * =========================================================
 */


/*
 * =========================================================
 * CONFIGURATION
 * =========================================================
 *
 * These are generic safety/performance limits.
 * They are NOT company-specific hardcodes.
 * =========================================================
 */

const HIMALAYAS_TITLE_SEARCH_MAX_PAGES = 20;
const HIMALAYAS_COMPANY_SEARCH_MAX_PAGES = 20;

const PROVIDER_MATCH_THRESHOLD = 0.78;

const FETCH_TIMEOUT_MS = 5000;


/*
 * =========================================================
 * BASIC RESPONSE HELPERS
 * =========================================================
 */

function sendJson(res, status, body) {
  res.status(status);

  for (const [key, value] of Object.entries(
    JSON_HEADERS
  )) {
    res.setHeader(key, value);
  }

  return res.json(body);
}


/*
 * =========================================================
 * URL HELPERS
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


/*
 * =========================================================
 * REQUESTED TITLE FROM HIMALAYAS SLUG
 * =========================================================
 *
 * Examples:
 *
 * ai-product-manager-5205658339
 *      ↓
 * ai product manager
 *
 * senior-ai-engineer
 *      ↓
 * senior ai engineer
 *
 * Numeric suffixes with 5+ digits are treated as listing
 * identifiers rather than title text.
 * =========================================================
 */

function titleFromJobSlug(jobSlug = "") {
  return String(jobSlug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+\d{5,}$/g, "")
    .trim();
}


/*
 * =========================================================
 * TOKEN / SIMILARITY HELPERS
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
 * JOB SLUG SIMILARITY
 * =========================================================
 *
 * Used only as a secondary signal.
 *
 * This helps distinguish records when Himalayas has multiple
 * jobs with identical or very similar titles.
 * =========================================================
 */

function jobSlugSimilarity(
  requestedJobSlug = "",
  job = {}
) {
  const requested =
    slugify(
      String(requestedJobSlug)
        .replace(
          /\d{5,}$/g,
          ""
        )
    );

  const candidates = [
    job.slug,
    job.jobSlug,
    job.guid,
    job.applicationLink,
  ]
    .filter(Boolean)
    .map(slugify);

  if (!requested || !candidates.length) {
    return 0;
  }

  let best = 0;

  for (const candidate of candidates) {
    const score =
      jaccardSimilarity(
        requested,
        candidate
      );

    if (score > best) {
      best = score;
    }
  }

  return best;
}


/*
 * =========================================================
 * COUNTRY / LOCATION MATCHING
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
    const response =
      await fetch(
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

    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(
  url,
  options = {},
  timeoutMs = FETCH_TIMEOUT_MS
) {
  try {
    const response =
      await fetchWithTimeout(
        url,
        options,
        timeoutMs
      );

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
      };
    }

    const data =
      await response.json();

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
    };
  }
}


/*
 * =========================================================
 * HIMALAYAS JOB URL PARSER
 * =========================================================
 */

function extractHimalayasJob(
  url
) {
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
 * HIMALAYAS JOB CANDIDATE SCORING
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
    normalizeCompany(
      job.companySlug || ""
    ) ===
    normalizeCompany(
      companySlug || ""
    )
      ? 1
      : jaccardSimilarity(
          companySlug,
          job.companySlug ||
            job.companyName ||
            ""
        );

  const slugScore =
    jobSlugSimilarity(
      jobSlug,
      job
    );

  /*
   * Exact title is the strongest source-job signal.
   */

  let score =
    titleScore * 0.65 +
    companyScore * 0.20 +
    slugScore * 0.15;

  if (
    normalizeTitle(
      job.title || ""
    ) ===
    normalizeTitle(
      requestedTitle
    )
  ) {
    score += 0.20;
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
 * HIMALAYAS SEARCH PAGE
 * =========================================================
 *
 * IMPORTANT:
 *
 * /jobs/api/search uses PAGE pagination.
 *
 * We deliberately do NOT send cursor here.
 * =========================================================
 */

async function searchHimalayasPage({
  companySlug,
  query,
  page,
  sort = "relevant",
}) {
  const params =
    new URLSearchParams();

  params.set(
    "limit",
    "20"
  );

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
    6000
  );
}


/*
 * =========================================================
 * HIMALAYAS SOURCE-JOB DISCOVERY
 * =========================================================
 *
 * MULTI-STAGE DISCOVERY
 *
 * Stage 1:
 *   Company + requested title
 *
 * Stage 2:
 *   Company-only pagination
 *
 * Stage 3:
 *   Broader title search
 *
 * We never trust the first fuzzy result.
 * =========================================================
 */

async function getHimalayasJob(
  companySlug,
  jobSlug
) {
  const requestedTitle =
    titleFromJobSlug(
      jobSlug
    );

  const normalizedTargetTitle =
    normalizeTitle(
      requestedTitle
    );

  if (!companySlug || !requestedTitle) {
    return null;
  }

  const allCandidates = [];

  const seenGuids =
    new Set();

  function collectJobs(jobs) {
    if (!Array.isArray(jobs)) {
      return;
    }

    for (const job of jobs) {
      if (!job) {
        continue;
      }

      const identity =
        String(
          job.guid ||
          job.applicationLink ||
          `${job.companySlug}:${job.title}:${job.pubDate || ""}`
        );

      if (
        seenGuids.has(identity)
      ) {
        continue;
      }

      seenGuids.add(identity);

      allCandidates.push(job);
    }
  }


  /*
   * =======================================================
   * STAGE 1
   * Company + exact-ish title search
   * =======================================================
   */

  for (
    let page = 1;
    page <=
    HIMALAYAS_TITLE_SEARCH_MAX_PAGES;
    page++
  ) {
    const result =
      await searchHimalayasPage({
        companySlug,
        query:
          requestedTitle,
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

    collectJobs(
      result.data.jobs
    );

    const exact =
      result.data.jobs.find(
        (job) =>
          normalizeTitle(
            job.title || ""
          ) ===
          normalizedTargetTitle
      );

    if (exact) {
      return exact;
    }

    const totalCount =
      numberValue(
        result.data.totalCount
      );

    if (
      totalCount !== null &&
      page * 20 >= totalCount
    ) {
      break;
    }

    if (
      result.data.jobs.length < 20
    ) {
      break;
    }
  }


  /*
   * =======================================================
   * STAGE 2
   * Company-only search
   *
   * This is the important fallback.
   *
   * It catches jobs that aren't surfaced properly by the
   * title search ranking.
   * =======================================================
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
        query:
          "",
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

    collectJobs(
      result.data.jobs
    );

    const exact =
      result.data.jobs.find(
        (job) =>
          normalizeTitle(
            job.title || ""
          ) ===
          normalizedTargetTitle
      );

    if (exact) {
      return exact;
    }

    const totalCount =
      numberValue(
        result.data.totalCount
      );

    if (
      totalCount !== null &&
      page * 20 >= totalCount
    ) {
      break;
    }

    if (
      result.data.jobs.length < 20
    ) {
      break;
    }
  }


  /*
   * =======================================================
   * STAGE 3
   * Broader title search without company restriction
   *
   * This is deliberately last so we never accidentally
   * select another company's job before exhausting the
   * correct company.
   * =======================================================
   */

  for (
    let page = 1;
    page <= 5;
    page++
  ) {
    const result =
      await searchHimalayasPage({
        companySlug:
          "",
        query:
          requestedTitle,
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

    for (
      const job
      of result.data.jobs
    ) {
      if (
        normalizeCompany(
          job.companySlug ||
            job.companyName ||
            ""
        ) ===
        normalizeCompany(
          companySlug
        )
      ) {
        collectJobs([
          job,
        ]);
      }
    }
  }


  /*
   * =======================================================
   * FINAL RANKING
   *
   * Exact title wins.
   * Otherwise use strong fuzzy evidence.
   * =======================================================
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

  if (
    !best ||
    best.evidence.titleScore < 0.65
  ) {
    return null;
  }

  /*
   * Strong exact/near-exact title match.
   */

  if (
    best.evidence.titleScore >=
    0.90
  ) {
    return best.job;
  }

  /*
   * Conservative fuzzy fallback.
   */

  if (
    best.evidence.score >=
    0.78
  ) {
    return best.job;
  }

  return null;
}


/*
 * =========================================================
 * COMPANY IDENTIFIER CANDIDATES
 * ========================================================= */

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

  /*
   * Add meaningful individual company-name tokens.
   *
   * This is intentionally generic.
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
    add(token);
  }

  return values.slice(
    0,
    8
  );
}


/*
 * =========================================================
 * PROVIDER MATCH SCORING
 * ========================================================= */

function scoreProviderJob(
  sourceJob,
  providerJob,
  identifierConfidence = 1
) {
  const titleCandidates = [
    sourceJob.requestedTitle,
    sourceJob.title,
  ]
    .filter(Boolean);

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
    ) *
      0.10 +
    salaryScore * 0.05 +
    identifierConfidence *
      0.10;

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
        const allJobs = [];

        /*
         * Greenhouse board endpoints commonly return the
         * public board's jobs in one response. We request
         * content so description matching is available.
         */

        const url =
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
            identifier
          )}/jobs?content=true`;

        const result =
          await fetchJson(
            url,
            {},
            5000
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

        allJobs.push(
          ...result.data.jobs
        );

        let best = null;

        for (
          const job
          of allJobs
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
            (!best ||
              score.score >
                best.score.score)
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

        if (!isHttpUrl(applicationUrl)) {
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
              5000
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
              (!best ||
                score.score >
                  best.score.score)
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
            5000
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
            (!best ||
              score.score >
                best.score.score)
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
 *
 * FUTURE-PROOFING:
 *
 * The old version only inspected the first 5 results.
 *
 * SmartRecruiters officially supports paginated postings
 * with limit/offset.
 *
 * We now walk multiple pages and inspect every relevant
 * candidate returned by the company endpoint.
 * =========================================================
 */

async function resolveSmartRecruiters(
  sourceJob,
  identifiers
) {
  const attempts =
    identifiers.map(
      async (identifier) => {
        const candidates = [];

        const MAX_PAGES = 10;
        const LIMIT = 100;

        for (
          let page = 0;
          page < MAX_PAGES;
          page++
        ) {
          const offset =
            page * LIMIT;

          const searchUrl =
            `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
              identifier
            )}/postings?limit=${LIMIT}&offset=${offset}&q=${encodeURIComponent(
              sourceJob.requestedTitle ||
                sourceJob.title
            )}`;

          const listResult =
            await fetchJson(
              searchUrl,
              {},
              5000
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

          candidates.push(
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

        /*
         * De-duplicate posting IDs.
         */

        const unique =
          new Map();

        for (
          const posting
          of candidates
        ) {
          if (
            posting?.id &&
            !unique.has(
              String(
                posting.id
              )
            )
          ) {
            unique.set(
              String(
                posting.id
              ),
              posting
            );
          }
        }

        const postingCandidates =
          Array.from(
            unique.values()
          );

        /*
         * Fetch detailed posting data.
         */

        const detailAttempts =
          postingCandidates.map(
            async (posting) => {
              if (!posting.id) {
                return null;
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
                  5000
                );

              if (
                !detailResult.ok ||
                !detailResult.data
              ) {
                return null;
              }

              const detail =
                detailResult.data;

              const candidate = {
                title:
                  detail.name ||
                  detail.jobAd
                    ?.sections
                    ?.jobTitle
                    ?.text ||
                  posting.name ||
                  "",

                location: [
                  detail.location
                    ?.city,

                  detail.location
                    ?.region,

                  detail.location
                    ?.country,
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
                return null;
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
                return null;
              }

              return {
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
            }
          );

        const results =
          await Promise.all(
            detailAttempts
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
 * ========================================================= */

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
            5000
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
              job.salary
                ?.salary_from ??
              null,

            maxSalary:
              job.salary
                ?.salary_to ??
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
            (!best ||
              score.score >
                best.score.score)
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
              best.job.title,

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
 * ========================================================= */

async function resolveRecruitee(
  sourceJob,
  identifiers
) {
  const attempts =
    identifiers.map(
      async (identifier) => {
        const url =
          `https://${encodeURIComponent(
            identifier
          )}.recruitee.com/api/offers/`;

        const result =
          await fetchJson(
            url,
            {},
            5000
          );

        if (
          !result.ok ||
          !result.data
        ) {
          return null;
        }

        const offers =
          Array.isArray(
            result.data
          )
            ? result.data
            : Array.isArray(
                result.data.offers
              )
              ? result.data.offers
              : [];

        let best = null;

        for (
          const offer
          of offers
        ) {
          if (
            offer.status &&
            normalize(
              offer.status
            ) !==
              "published"
          ) {
            continue;
          }

          const candidate = {
            title:
              offer.title ||
              "",

            location:
              Array.isArray(
                offer.locations
              )
                ? offer.locations
                    .map(
                      (location) =>
                        location?.name ||
                        location?.city ||
                        location?.country ||
                        ""
                    )
                    .join(", ")
                : offer.location ||
                  "",

            description:
              offer.description ||
              offer.description_html ||
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
            score.score >=
              PROVIDER_MATCH_THRESHOLD &&
            (!best ||
              score.score >
                best.score.score)
          ) {
            best = {
              score,
              offer,
              identifier,
            };
          }
        }

        if (!best) {
          return null;
        }

        const applicationUrl =
          best.offer.careers_url ||
          best.offer.careersUrl ||
          best.offer.url ||
          best.offer.apply_url ||
          best.offer.applyUrl ||
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
            "recruitee",

          method:
            "recruitee-careers-api",

          applicationUrl,

          matchedJob: {
            title:
              best.offer.title ||
              "",

            location:
              best.offer.location ||
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
 * UNIVERSAL PROVIDER RESOLUTION
 * ========================================================= */

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
      name: "greenhouse",

      resolve:
        resolveGreenhouse,
    },

    {
      name: "lever",

      resolve:
        resolveLever,
    },

    {
      name: "ashby",

      resolve:
        resolveAshby,
    },

    {
      name: "smartrecruiters",

      resolve:
        resolveSmartRecruiters,
    },

    {
      name: "workable",

      resolve:
        resolveWorkable,
    },

    {
      name: "recruitee",

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
 * ========================================================= */

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
     * HIMALAYAS SOURCE-JOB LOOKUP
     * =====================================================
     */

    const himalayasJob =
      await getHimalayasJob(
        slugData.companySlug,
        slugData.jobSlug
      );

    if (!himalayasJob) {
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
            "fallback-himalayas-job-not-found",

          companySlug:
            slugData.companySlug,

          jobSlug:
            slugData.jobSlug,

          requestedTitle:
            slugData.requestedTitle,
        }
      );
    }


    /*
     * =====================================================
     * BUILD SOURCE JOB
     * =====================================================
     *
     * We deliberately preserve:
     *
     * requestedTitle
     *      ↓
     * original URL-derived title
     *
     * title
     *      ↓
     * Himalayas API title
     *
     * This is critical for cases like YipitData.
     * =====================================================
     */

    const sourceJob = {
      company:
        req.query?.company ||
        himalayasJob.companyName ||
        "",

      title:
        req.query?.title ||
        himalayasJob.title ||
        "",

      requestedTitle:
        slugData.requestedTitle ||
        "",

      companySlug:
        himalayasJob.companySlug ||
        slugData.companySlug,

      description:
        himalayasJob.description ||
        himalayasJob.excerpt ||
        "",

      employmentType:
        req.query?.employmentType ||
        himalayasJob.employmentType ||
        "",

      minSalary:
        numberValue(
          req.query?.minSalary ??
            himalayasJob.minSalary
        ),

      maxSalary:
        numberValue(
          req.query?.maxSalary ??
            himalayasJob.maxSalary
        ),

      currency:
        req.query?.currency ||
        himalayasJob.currency ||
        "",

      salaryPeriod:
        req.query?.salaryPeriod ||
        himalayasJob.salaryPeriod ||
        "",

      locationRestrictions:
        Array.isArray(
          himalayasJob.locationRestrictions
        )
          ? himalayasJob.locationRestrictions
          : [],
    };


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
        },

        checkedProviders: [
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
