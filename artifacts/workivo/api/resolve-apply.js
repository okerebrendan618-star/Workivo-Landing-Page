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
 * Himalayas structured API
 *      ↓
 * Get canonical job data
 *      ↓
 * Identify company + job
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
 * Strong job match?
 *      ↓
 * YES → external application URL
 * NO  → Himalayas fallback
 *
 * IMPORTANT:
 *
 * This resolver NEVER invents an application URL.
 *
 * If a provider cannot be verified, it is skipped.
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

  /*
   * If Himalayas did not provide a restriction,
   * location should not disqualify a match.
   */
  if (!restrictions.length) {
    return true;
  }

  /*
   * A remote provider posting can represent
   * multiple countries without listing them individually.
   */
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
  /*
   * Salary is supplementary evidence.
   *
   * We do NOT require salary because many ATS APIs
   * don't expose compensation.
   */

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

  /*
   * If both sides have salary information,
   * compare overlapping ranges.
   */

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
 *
 * A resolver cannot sit forever waiting for an ATS.
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
 * We use the public API instead of scraping the page.
 *
 * Himalayas documents companySlug as the canonical
 * company identifier and exposes title, company,
 * salary, employment type, location restrictions,
 * description and applicationLink.
 *
 * =========================================================
 */

async function getHimalayasJob(
  companySlug,
  jobSlug
) {
  const titleQuery =
    jobSlug
      .replace(/[-_]+/g, " ")
      .trim();

  const endpoint =
    "https://himalayas.app/jobs/api/search?" +
    new URLSearchParams({
      company:
        companySlug,

      q:
        titleQuery,

      page:
        "1",
    }).toString();

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
   * First preference:
   * exact title match.
   */

  const exact =
    jobs.find(
      (job) =>
        normalizeTitle(
          job.title
        ) ===
        normalizeTitle(
          titleQuery
        )
    );

  if (exact) {
    return exact;
  }

  /*
   * Second preference:
   * strongest title similarity.
   */

  let best = null;
  let bestScore = 0;

  for (const job of jobs) {
    const score =
      titleSimilarity(
        job.title,
        titleQuery
      );

    if (score > bestScore) {
      bestScore = score;
      best = job;
    }
  }

  return bestScore >= 0.65
    ? best
    : null;
}


/*
 * =========================================================
 * COMPANY IDENTIFIER CANDIDATES
 * =========================================================
 *
 * ATS platforms use different company identifiers.
 *
 * We try several deterministic forms instead of assuming
 * one universal naming convention.
 *
 * Example:
 *
 * "Epoch AI"
 *
 * may become:
 *
 * epoch-ai
 * epochai
 * epoch
 *
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

  /*
   * Try the first meaningful company word
   * for cases where the ATS board uses a short brand name.
   */

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
 * We need strong evidence.
 *
 * TITLE:
 *       most important
 *
 * LOCATION:
 *       important when available
 *
 * DESCRIPTION:
 *       secondary confirmation
 *
 * SALARY:
 *       additional confirmation
 *
 * PROVIDER IDENTIFIER:
 *       confirms that the queried ATS board belongs
 *       to the company we are resolving
 * =========================================================
 */

function scoreProviderJob(
  sourceJob,
  providerJob,
  identifierConfidence = 1
) {
  const titleScore =
    titleSimilarity(
      sourceJob.title,
      providerJob.title
    );

  /*
   * A weak title match should NEVER resolve.
   */
  if (titleScore < 0.78) {
    return {
      score: 0,
      titleScore,
      locationScore: 0,
      descriptionScore: 0,
      salaryScore: 0,
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

  /*
   * If the source explicitly restricts locations
   * and the provider contradicts that location,
   * reject the job.
   */

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

  /*
   * Strong weighted score.
   */

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
  };
}


/*
 * =========================================================
 * GREENHOUSE
 * =========================================================
 *
 * Greenhouse's public Job Board API does not require
 * authentication for GET requests.
 *
 * It exposes published jobs and absolute_url.
 *
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

        for (const job of result.data.jobs) {
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
 *
 * Lever's public postings API exposes published jobs,
 * including hostedUrl and applyUrl.
 *
 * We test both global and EU API hosts.
 *
 * =========================================================
 */

async function resolveLever(
  sourceJob,
  identifiers
) {
  const attempts = [];

  for (const identifier of identifiers) {
    for (const base of [
      "https://api.lever.co/v0/postings",
      "https://api.eu.lever.co/v0/postings",
    ]) {
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

          for (const job of result.data) {
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
 *
 * Ashby's public Job Postings API exposes jobUrl and
 * applyUrl.
 *
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

        for (const job of result.data.jobs) {
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
 *
 * SmartRecruiters' Posting API provides public posting
 * data and an applyUrl on the detailed posting object.
 *
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

        /*
         * Only inspect a small number of candidates.
         * This keeps the resolver fast.
         */

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
 *
 * Workable provides public careers endpoints for published
 * job information.
 *
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

        for (const job of jobs) {
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
 *
 * Recruitee exposes published offers through its careers
 * site API.
 *
 * Some Recruitee accounts may require a Careers Site API
 * token depending on their current configuration.
 *
 * If the public endpoint rejects the request, we simply
 * skip the provider.
 *
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

        for (const offer of offers) {
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

        /*
         * Prefer an application/careers URL returned by
         * Recruitee itself.
         */
        const applicationUrl =
          best.offer.careers_url ||
          best.offer.careersUrl ||
          best.offer.url ||
          best.offer.apply_url ||
          best.offer.applyUrl ||
          "";

        /*
         * If Recruitee did not return an application URL,
         * do NOT invent one.
         */
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

  /*
   * Provider order.
   *
   * These are public job-data systems where possible.
   */

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

  /*
   * Run provider discovery in parallel.
   *
   * This prevents a slow provider from forcing the whole
   * resolver to wait before checking the others.
   */

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

  /*
   * Choose the strongest verified provider match.
   */
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
  /*
   * OPTIONS
   */
  if (req.method === "OPTIONS") {
    return sendJson(
      res,
      200,
      {}
    );
  }

  /*
   * GET ONLY
   */
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
    /*
     * -----------------------------------------------------
     * 1. GET ORIGINAL HIMALAYAS URL
     * -----------------------------------------------------
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

    /*
     * -----------------------------------------------------
     * 2. PARSE HIMALAYAS JOB
     * -----------------------------------------------------
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
     * -----------------------------------------------------
     * 3. GET STRUCTURED HIMALAYAS JOB DATA
     * -----------------------------------------------------
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
        }
      );
    }

    /*
     * -----------------------------------------------------
     * 4. BUILD CANONICAL SOURCE JOB
     * -----------------------------------------------------
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
     * -----------------------------------------------------
     * 5. UNIVERSAL ATS RESOLUTION
     * -----------------------------------------------------
     */

    const resolved =
      await resolveUniversal(
        sourceJob,
        himalayasJob.companySlug ||
          slugData.companySlug
      );

    /*
     * -----------------------------------------------------
     * 6. SUCCESS
     * -----------------------------------------------------
     */

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

    /*
     * -----------------------------------------------------
     * 7. SAFE FALLBACK
     * -----------------------------------------------------
     *
     * This is VERY important.
     *
     * We do NOT guess.
     *
     * We do NOT construct random employer URLs.
     *
     * We send the user back to the original Himalayas
     * application page if no public ATS match is verified.
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

        resolved: false,

        method:
          "fallback-no-verified-ats-match",

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
