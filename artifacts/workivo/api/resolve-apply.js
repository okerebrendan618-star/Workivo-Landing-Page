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
 * Extract company + requested job title from URL
 *      ↓
 * Himalayas structured API
 *      ↓
 * Get canonical job metadata
 *      ↓
 * Keep BOTH:
 *
 *   requestedTitle
 *   Himalayas API title
 *
 *      ↓
 * Try public ATS providers
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
 * YES → external application URL
 * NO  → Himalayas fallback
 *
 * IMPORTANT:
 *
 * This resolver NEVER invents an application URL.
 *
 * =========================================================
 */


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
 * Example:
 *
 * ai-product-manager-5205658339
 *
 * becomes:
 *
 * AI Product Manager
 *
 * The numeric suffix is treated as a job identifier,
 * NOT part of the title.
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
 * FETCH WITH TIMEOUT
 * =========================================================
 */

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = 4500
) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
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
  timeoutMs = 4500
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

    return {
      companySlug:
        decodeURIComponent(
          match[1]
        ),

      jobSlug:
        decodeURIComponent(
          match[2]
        ),

      requestedTitle:
        titleFromJobSlug(
          decodeURIComponent(
            match[2]
          )
        ),
    };
  } catch {
    return null;
  }
}


/*
 * =========================================================
 * HIMALAYAS STRUCTURED API
 * =========================================================
 *
 * IMPORTANT:
 *
 * We DO NOT return a fuzzy match immediately.
 *
 * That was the bug causing:
 *
 * AI Product Manager
 *
 * to incorrectly become:
 *
 * Data Product Manager
 *
 * because both contain:
 *
 * product + manager
 *
 * Instead:
 *
 * 1. Search all available company pages.
 * 2. Immediately return ONLY an exact title match.
 * 3. Keep the strongest fuzzy candidate in memory.
 * 4. Continue pagination.
 * 5. Only use fuzzy matching after pagination finishes.
 *
 * This protects against a wrong early-page match.
 * =========================================================
 */

async function getHimalayasJob(
  companySlug,
  jobSlug
) {
  const titleQuery =
    titleFromJobSlug(
      jobSlug
    );

  const normalizedTargetTitle =
    normalizeTitle(
      titleQuery
    );

  const MAX_PAGES = 8;

  let cursor = null;

  const seenCursors =
    new Set();

  let globalBest = null;
  let globalBestScore = 0;

  for (
    let page = 0;
    page < MAX_PAGES;
    page++
  ) {
    const params =
      new URLSearchParams({
        company:
          companySlug,

        limit:
          "20",
      });

    if (cursor) {
      params.set(
        "cursor",
        cursor
      );
    }

    const endpoint =
      "https://himalayas.app/jobs/api/search?" +
      params.toString();

    const result =
      await fetchJson(
        endpoint,
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

    const jobs =
      result.data.jobs;

    /*
     * =====================================================
     * EXACT TITLE MATCH
     * =====================================================
     *
     * Exact matches are returned immediately.
     *
     * Example:
     *
     * target:
     * AI Product Manager
     *
     * job:
     * AI Product Manager
     */

    const exact =
      jobs.find(
        (job) =>
          normalizeTitle(
            job.title
          ) ===
          normalizedTargetTitle
      );

    if (exact) {
      return exact;
    }

    /*
     * =====================================================
     * FUZZY MATCH
     * =====================================================
     *
     * We ONLY record the candidate.
     *
     * We DO NOT return it yet.
     *
     * This is the critical fix.
     */

    for (const job of jobs) {
      const score =
        titleSimilarity(
          job.title,
          titleQuery
        );

      if (
        score >
        globalBestScore
      ) {
        globalBestScore =
          score;

        globalBest = job;
      }
    }

    /*
     * =====================================================
     * NEXT CURSOR
     * =====================================================
     */

    const nextCursor =
      result.data.nextCursor;

    if (!nextCursor) {
      break;
    }

    if (
      seenCursors.has(
        nextCursor
      )
    ) {
      break;
    }

    seenCursors.add(
      nextCursor
    );

    cursor =
      nextCursor;
  }

  /*
   * =====================================================
   * FINAL FUZZY FALLBACK
   * =====================================================
   *
   * Only after pagination has finished.
   */

  if (
    globalBest &&
    globalBestScore >= 0.65
  ) {
    return globalBest;
  }

  return null;
}


/*
 * =========================================================
 * COMPANY IDENTIFIER CANDIDATES
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

  const firstWord =
    normalizeCompany(
      companyName
    ).split(/\s+/)[0];

  add(firstWord);

  return values.slice(
    0,
    5
  );
}


/*
 * =========================================================
 * PROVIDER MATCH SCORING
 * =========================================================
 *
 * IMPORTANT TITLE FIX:
 *
 * The resolver can now have:
 *
 * sourceJob.requestedTitle
 *
 * AND
 *
 * sourceJob.title
 *
 * We compare the provider job against BOTH.
 *
 * This matters when Himalayas has:
 *
 * Data Product Manager
 *
 * while the actual source URL says:
 *
 * AI Product Manager
 *
 * The strongest title match wins.
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

  if (titleScore < 0.78) {
    return {
      score: 0,
      titleScore,
      locationScore: 0,
      descriptionScore: 0,
      salaryScore: 0,
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
          )}/jobs`;

        const result =
          await fetchJson(
            url,
            {},
            4500
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
            identifier ===
            sourceJob.companySlug
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
              0.78 &&
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

        return {
          provider:
            "greenhouse",

          method:
            "greenhouse-public-job-board-api",

          applicationUrl:
            best.job.absolute_url,

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
              4500
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
              identifier ===
              sourceJob.companySlug
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
                0.78 &&
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

          return {
            provider:
              "lever",

            method:
              "lever-public-postings-api",

            applicationUrl:
              best.job.applyUrl ||
              best.job.hostedUrl,

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
      .filter(
        (result) =>
          result &&
          result.applicationUrl
      )
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
            4500
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
            identifier ===
            sourceJob.companySlug
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
              0.78 &&
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

        return {
          provider:
            "ashby",

          method:
            "ashby-public-job-posting-api",

          applicationUrl:
            best.job.applyUrl ||
            best.job.jobUrl,

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
      .filter(
        (result) =>
          result &&
          result.applicationUrl
      )
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
        const searchUrl =
          `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
            identifier
          )}/postings?limit=100&q=${encodeURIComponent(
            sourceJob.requestedTitle ||
              sourceJob.title
          )}`;

        const listResult =
          await fetchJson(
            searchUrl,
            {},
            4500
          );

        if (
          !listResult.ok ||
          !listResult.data ||
          !Array.isArray(
            listResult.data.content
          )
        ) {
          return null;
        }

        const candidates =
          listResult.data.content
            .slice(0, 5);

        const detailAttempts =
          candidates.map(
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
                  4500
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

              const score =
                scoreProviderJob(
                  sourceJob,
                  candidate,
                  identifier ===
                    sourceJob.companySlug
                    ? 1
                    : 0.9
                );

              if (
                score.score < 0.78
              ) {
                return null;
              }

              return {
                provider:
                  "smartrecruiters",

                method:
                  "smartrecruiters-public-posting-api",

                applicationUrl:
                  detail.applyUrl ||
                  "",

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
            .filter(
              (result) =>
                result &&
                result.applicationUrl
            )
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
            4500
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

          const score =
            scoreProviderJob(
              sourceJob,
              candidate,
              identifier ===
                sourceJob.companySlug
                ? 1
                : 0.9
            );

          if (
            score.score >=
              0.78 &&
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

        return {
          provider:
            "workable",

          method:
            "workable-public-careers-api",

          applicationUrl:
            best.job.shortlink ||
            best.job.application_url ||
            best.job.url,

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
      .filter(
        (result) =>
          result &&
          result.applicationUrl
      )
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
            4500
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
            ) !== "published"
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

          const score =
            scoreProviderJob(
              sourceJob,
              candidate,
              identifier ===
                sourceJob.companySlug
                ? 1
                : 0.9
            );

          if (
            score.score >=
              0.78 &&
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

        if (!applicationUrl) {
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
      .filter(
        (result) =>
          result &&
          result.applicationUrl
      )
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
          } catch {
            return null;
          }
        }
      )
    );

  const matches =
    results.filter(
      (result) =>
        result &&
        result.applicationUrl
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
  if (req.method === "OPTIONS") {
    return sendJson(
      res,
      200,
      {}
    );
  }

  if (req.method !== "GET") {
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

    if (!isHttpUrl(originalUrl)) {
      return sendJson(
        res,
        400,
        {
          error:
            "Invalid URL",
        }
      );
    }

    if (!isHimalayasUrl(originalUrl)) {
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

          resolved: false,

          method:
            "fallback-invalid-himalayas-job-url",
        }
      );
    }

    /*
     * =====================================================
     * HIMALAYAS LOOKUP
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

          resolved: false,

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
     * IMPORTANT:
     *
     * requestedTitle comes from the original URL slug.
     *
     * title comes from Himalayas API.
     *
     * We preserve both.
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

          resolved: true,

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
          },

          source: {
            company:
              sourceJob.company,

            title:
              sourceJob.title,

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

    return sendJson(
      res,
      200,
      {
        originalUrl,

        finalUrl:
          originalUrl,

        applyUrl:
          originalUrl,

        resolved: false,

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
