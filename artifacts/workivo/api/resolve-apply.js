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
 * Greenhouse is the ONLY enabled provider.
 *
 * Accepted flow:
 *
 * Himalayas Job
 *      ↓
 * Himalayas source lookup
 *      ↓
 * Greenhouse evidence discovery
 *      ↓
 * Known Greenhouse board token?
 *      ↓
 * Known Greenhouse job ID?
 *      ↓
 * Exact Greenhouse verification
 *      ↓
 * Stop immediately if verified
 *      ↓
 * Otherwise controlled fallback board search
 *      ↓
 * Strict title/location verification
 *      ↓
 * Greenhouse API absolute_url
 *
 * IMPORTANT:
 *
 * - No Lever
 * - No Ashby
 * - No SmartRecruiters
 * - No Workable
 * - No Recruitee
 * - No Himalayas fallback application URL
 * - No guessed application URLs
 * - No hardcoded Greenhouse job IDs
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

/*
 * Normal Greenhouse matching is intentionally strict.
 */
const PROVIDER_MATCH_THRESHOLD = 0.82;

/*
 * Exact Greenhouse ID verification has its own title
 * threshold because the ID itself is already very strong
 * evidence.
 */
const EXACT_GREENHOUSE_TITLE_THRESHOLD = 0.85;

const FETCH_TIMEOUT_MS = 5000;

/*
 * Maximum number of guessed Greenhouse board identifiers
 * after stronger evidence has failed.
 */
const MAX_COMPANY_IDENTIFIERS = 12;
const GREENHOUSE_FALLBACK_IDENTIFIER_LIMIT = 4;

/*
 * Known/evidence-backed board searches can inspect more
 * pages than guessed identifiers.
 */
const GREENHOUSE_MAX_PAGES = 3;
const GREENHOUSE_FALLBACK_MAX_PAGES = 3;


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
 * We never trust a Greenhouse-looking URL as the final
 * application URL.
 *
 * It is evidence only.
 *
 * Final applyUrl MUST come from Greenhouse's API.
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
        .map((part) => {
          try {
            return decodeURIComponent(part);
          } catch {
            return part;
          }
        });

    let boardToken = "";
    let jobId = "";

    if (
      hostname === "boards.greenhouse.io" ||
      hostname === "job-boards.greenhouse.io"
    ) {
      const jobsIndex =
        pathParts.findIndex(
          (part) =>
            part.toLowerCase() === "jobs"
        );

      if (jobsIndex > 0) {
        boardToken =
          pathParts[jobsIndex - 1] || "";

        jobId =
          pathParts[jobsIndex + 1] || "";
      }
    }

    if (!jobId) {
      jobId =
        parsed.searchParams.get(
          "gh_jid"
        ) || "";
    }

    /*
     * Greenhouse embedded job-board URLs:
     *
     * https://boards.greenhouse.io/embed/job_board?for=tebra
     *
     * These do not contain a job ID, but they give us a
     * legitimate Greenhouse board token.
     */
    if (
      !boardToken &&
      (
        hostname === "boards.greenhouse.io" ||
        hostname === "job-boards.greenhouse.io"
      )
    ) {
      const embedPath =
        pathParts
          .map((part) =>
            part.toLowerCase()
          )
          .join("/");

      if (
        embedPath ===
          "embed/job_board" ||
        embedPath ===
          "embed/job_board/index.html"
      ) {
        boardToken =
          parsed.searchParams.get(
            "for"
          ) || "";
      }
    }

    if (
      !boardToken &&
      pathParts.length >= 1
    ) {
      const jobsIndex =
        pathParts.findIndex(
          (part) =>
            part.toLowerCase() === "jobs"
        );

      if (jobsIndex > 0) {
        boardToken =
          pathParts[jobsIndex - 1] || "";
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
 * GREENHOUSE EVIDENCE FROM HIMALAYAS HTML
 * =========================================================
 *
 * This is only a discovery fallback.
 *
 * We inspect the Himalayas page when the Himalayas API did
 * not expose a usable Greenhouse applicationLink.
 *
 * We ONLY extract Greenhouse evidence.
 *
 * We NEVER return a discovered URL directly to the user.
 * =========================================================
 */

async function discoverGreenhouseEvidenceFromHimalayasPage(
  originalUrl
) {
  if (!isHimalayasUrl(originalUrl)) {
    return null;
  }

  try {
    const response =
      await fetchWithTimeout(
        originalUrl,
        {
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
          },
        },
        6000
      );

    if (!response.ok) {
      return null;
    }

    let html =
      await response.text();

    if (!html) {
      return null;
    }

    /*
     * Normalize common HTML/JSON escaping.
     *
     * Himalayas pages can contain:
     *
     * https:\/\/job-boards.greenhouse.io\/tebra\/jobs\/123
     *
     * or:
     *
     * https://boards.greenhouse.io/embed/job_board?for=tebra
     *
     * or HTML-encoded versions.
     */
    html = html
      .replace(/\\u002F/gi, "/")
      .replace(/\\u002f/gi, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/\\\//g, "/")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#x2f;|&#47;/gi, "/")
      .replace(/&#x26;|&#38;/gi, "&");

    /*
     * -------------------------------------------------------
     * 1. Full Greenhouse job URLs
     * -------------------------------------------------------
     *
     * Supports:
     *
     * https://boards.greenhouse.io/company/jobs/123
     * https://job-boards.greenhouse.io/company/jobs/123
     * boards.greenhouse.io/company/jobs/123
     * escaped variants after normalization
     */
    const greenhouseJobUrlRegex =
      /(?:https?:)?\/\/(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9][a-z0-9._-]*)\/jobs\/(\d+)(?:\?[^"'<>\\\s]*)?/gi;

    let match;

    while (
      (match =
        greenhouseJobUrlRegex.exec(
          html
        )) !== null
    ) {
      const boardToken =
        match[1] || "";

      const jobId =
        match[2] || "";

      if (
        boardToken &&
        jobId
      ) {
        return {
          applicationLink:
            match[0],

          boardToken:
            boardToken.trim(),

          jobId:
            String(
              jobId
            ).trim(),
        };
      }
    }


    /*
     * -------------------------------------------------------
     * 2. Greenhouse job URLs where protocol/slashes are
     *    represented differently.
     * -------------------------------------------------------
     */
    const greenhousePathRegex =
      /(?:boards|job-boards)\.greenhouse\.io[\/\\]+([a-z0-9][a-z0-9._-]*)[\/\\]+jobs[\/\\]+(\d+)/gi;

    while (
      (match =
        greenhousePathRegex.exec(
          html
        )) !== null
    ) {
      const boardToken =
        match[1] || "";

      const jobId =
        match[2] || "";

      if (
        boardToken &&
        jobId
      ) {
        return {
          applicationLink: "",

          boardToken:
            boardToken.trim(),

          jobId:
            String(
              jobId
            ).trim(),
        };
      }
    }


    /*
     * -------------------------------------------------------
     * 3. Greenhouse embedded job board.
     * -------------------------------------------------------
     *
     * Common Greenhouse embed:
     *
     * boards.greenhouse.io/embed/job_board?for=tebra
     *
     * This is strong board evidence even though it does not
     * contain an individual job ID.
     */
    const greenhouseEmbedRegex =
      /(?:boards|job-boards)\.greenhouse\.io[\/\\]+embed[\/\\]+job_board(?:[^"'<>\\\s]*?)(?:[?&]|%3F|%26)for(?:=|%3D)([a-z0-9][a-z0-9._-]*)/i;

    const embedMatch =
      html.match(
        greenhouseEmbedRegex
      );

    if (
      embedMatch &&
      embedMatch[1]
    ) {
      return {
        applicationLink: "",

        boardToken:
          embedMatch[1]
            .trim(),

        jobId: "",
      };
    }


    /*
     * -------------------------------------------------------
     * 4. Greenhouse board URL without /jobs/.
     * -------------------------------------------------------
     *
     * Example:
     *
     * https://job-boards.greenhouse.io/tebra
     *
     * This gives us the board token and allows the resolver
     * to search the public Greenhouse board by title.
     */
    const greenhouseBoardRegex =
      /(?:https?:)?\/\/(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9][a-z0-9._-]*)(?:[\/?#"'<>\\\s]|$)/gi;

    while (
      (match =
        greenhouseBoardRegex.exec(
          html
        )) !== null
    ) {
      const boardToken =
        match[1] || "";

      if (
        boardToken &&
        boardToken.toLowerCase() !==
          "embed"
      ) {
        return {
          applicationLink: "",

          boardToken:
            boardToken.trim(),

          jobId: "",
        };
      }
    }


    /*
     * -------------------------------------------------------
     * 5. Greenhouse references inside JSON/data attributes.
     * -------------------------------------------------------
     *
     * Some pages don't expose a normal URL but may expose
     * board_token / boardToken values around Greenhouse
     * references.
     *
     * We only accept these if the same page contains an
     * explicit Greenhouse domain reference.
     */
    if (
      /(?:boards|job-boards)\.greenhouse\.io/i.test(
        html
      )
    ) {
      const boardTokenMatch =
        html.match(
          /["'](?:board_token|boardToken)["']\s*[:=]\s*["']([a-z0-9][a-z0-9._-]*)["']/i
        );

      if (
        boardTokenMatch &&
        boardTokenMatch[1]
      ) {
        return {
          applicationLink: "",

          boardToken:
            boardTokenMatch[1].trim(),

          jobId: "",
        };
      }
    }


    /*
     * -------------------------------------------------------
     * 6. gh_jid associated with a Greenhouse reference.
     * -------------------------------------------------------
     *
     * We NEVER accept a random gh_jid by itself.
     *
     * It must appear near a Greenhouse reference.
     */
    const greenhouseJidRegex =
      /(?:boards|job-boards)\.greenhouse\.io[\s\S]{0,600}?gh_jid(?:=|%3D|["':\s]+)(\d+)/i;

    const jidMatch =
      html.match(
        greenhouseJidRegex
      );

    if (
      jidMatch &&
      jidMatch[1]
    ) {
      const nearbyGreenhouse =
        html.match(
          /(?:boards|job-boards)\.greenhouse\.io[\/\\]+([a-z0-9][a-z0-9._-]*)/i
        );

      if (
        nearbyGreenhouse &&
        nearbyGreenhouse[1]
      ) {
        return {
          applicationLink: "",

          boardToken:
            nearbyGreenhouse[1].trim(),

          jobId:
            String(
              jidMatch[1]
            ).trim(),
        };
      }
    }


    return null;
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
    .replace(
      /[^\p{L}\p{N}\s$€£./:-]+/gu,
      " "
    )
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
 */

function normalizeTitle(value = "") {
  let title =
    normalize(value)
      .replace(
        /\b(full time|fulltime|part time|parttime|remote|hybrid|onsite|on site)\b/g,
        " "
      );

  /*
   * Normalize common finance/title abbreviations before
   * punctuation is removed.
   *
   * FP&A / FP & A / F.P.&A.
   *
   * become FPA.
   */
  title =
    title
      .replace(
        /\bf\s*p\s*&\s*a\b/gi,
        "fpa"
      )
      .replace(
        /\bfp\s+a\b/gi,
        "fpa"
      )
      .replace(
        /\bfp\s*and\s*a\b/gi,
        "fpa"
      );

  /*
   * Convert standalone Roman numeral job levels.
   *
   * Software Engineer I
   * Software Engineer 1
   *
   * become equivalent.
   */
  title =
    title.replace(
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
    .replace(
      /[^a-z0-9\s,-]+/g,
      " "
    )
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
 * TITLE SEMANTIC GROUPS
 * =========================================================
 */

const TITLE_LEVEL_GROUPS = [
  new Set([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ]),

  new Set([
    "junior",
    "jr",
    "entry",
    "associate",
  ]),

  new Set([
    "mid",
    "middle",
  ]),

  new Set([
    "senior",
    "sr",
  ]),

  new Set([
    "staff",
  ]),

  new Set([
    "principal",
  ]),

  new Set([
    "lead",
  ]),

  new Set([
    "manager",
  ]),

  new Set([
    "director",
  ]),

  new Set([
    "head",
  ]),

  new Set([
    "vp",
    "vice",
    "president",
  ]),

  new Set([
    "chief",
  ]),
];


const TITLE_SPECIALIZATION_GROUPS = [
  new Set([
    "backend",
    "back-end",
  ]),

  new Set([
    "frontend",
    "front-end",
  ]),

  new Set([
    "fullstack",
    "full-stack",
    "full",
  ]),

  new Set([
    "mobile",
    "ios",
    "android",
  ]),

  new Set([
    "web",
  ]),

  new Set([
    "data",
  ]),

  new Set([
    "machine",
    "ml",
    "ai",
  ]),

  new Set([
    "devops",
    "sre",
    "platform",
  ]),

  new Set([
    "security",
    "cybersecurity",
  ]),

  new Set([
    "cloud",
  ]),

  new Set([
    "embedded",
  ]),

  new Set([
    "qa",
    "quality",
    "test",
  ]),

  new Set([
    "product",
  ]),

  new Set([
    "design",
    "designer",
    "ux",
    "ui",
  ]),

  new Set([
    "sales",
  ]),

  new Set([
    "marketing",
  ]),
];


function titleGroupForTokens(
  tokens,
  groups
) {
  for (
    const group
    of groups
  ) {
    for (
      const token
      of tokens
    ) {
      if (
        group.has(token)
      ) {
        return group;
      }
    }
  }

  return null;
}


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


function titleTokenSet(value = "") {
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
          (
            word.length > 2 ||
            /^\d+$/.test(word)
          ) &&
          !STOP_WORDS.has(word)
      )
  );
}


function jaccardSimilarity(a, b) {
  const first =
    tokenSet(a);

  const second =
    tokenSet(b);

  if (
    !first.size ||
    !second.size
  ) {
    return 0;
  }

  let intersection = 0;

  for (
    const token
    of first
  ) {
    if (
      second.has(token)
    ) {
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


/*
 * =========================================================
 * STRICT TITLE SIMILARITY
 * =========================================================
 */

function titleSimilarity(a, b) {
  const first =
    normalizeTitle(a);

  const second =
    normalizeTitle(b);

  if (
    !first ||
    !second
  ) {
    return 0;
  }

  if (
    first === second
  ) {
    return 1;
  }

  const firstTokens =
    titleTokenSet(first);

  const secondTokens =
    titleTokenSet(second);

  if (
    !firstTokens.size ||
    !secondTokens.size
  ) {
    return 0;
  }

  const firstLevel =
    titleGroupForTokens(
      firstTokens,
      TITLE_LEVEL_GROUPS
    );

  const secondLevel =
    titleGroupForTokens(
      secondTokens,
      TITLE_LEVEL_GROUPS
    );

  if (
    firstLevel &&
    secondLevel &&
    firstLevel !== secondLevel
  ) {
    return 0.25;
  }

  const levelMismatch =
    Boolean(
      firstLevel
    ) !==
    Boolean(
      secondLevel
    );

  const firstSpecializations =
    [];

  const secondSpecializations =
    [];

  for (
    const group
    of TITLE_SPECIALIZATION_GROUPS
  ) {
    const firstHas =
      Array.from(
        firstTokens
      ).some(
        (token) =>
          group.has(token)
      );

    const secondHas =
      Array.from(
        secondTokens
      ).some(
        (token) =>
          group.has(token)
      );

    if (firstHas) {
      firstSpecializations.push(
        group
      );
    }

    if (secondHas) {
      secondSpecializations.push(
        group
      );
    }
  }

  if (
    firstSpecializations.length &&
    secondSpecializations.length
  ) {
    let compatible =
      false;

    for (
      const firstGroup
      of firstSpecializations
    ) {
      for (
        const secondGroup
        of secondSpecializations
      ) {
        if (
          firstGroup ===
          secondGroup
        ) {
          compatible = true;
        }
      }
    }

    if (!compatible) {
      return 0.30;
    }
  }

  let intersection = 0;

  for (
    const token
    of firstTokens
  ) {
    if (
      secondTokens.has(token)
    ) {
      intersection++;
    }
  }

  const union =
    firstTokens.size +
    secondTokens.size -
    intersection;

  const jaccard =
    union > 0
      ? intersection / union
      : 0;

  const smallerSize =
    Math.min(
      firstTokens.size,
      secondTokens.size
    );

  if (
    smallerSize >= 2 &&
    intersection ===
      smallerSize
  ) {
    if (
      levelMismatch
    ) {
      return Math.min(
        0.72,
        jaccard + 0.25
      );
    }

    return 0.94;
  }

  if (
    levelMismatch
  ) {
    return Math.min(
      jaccard,
      0.72
    );
  }

  return jaccard;
}


/*
 * =========================================================
 * JOB SLUG MATCHING
 * =========================================================
 */

function cleanRequestedJobSlug(
  jobSlug = ""
) {
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

  if (
    !requestedSlug
  ) {
    return 0;
  }

  const titleSlug =
    slugify(
      job.title || ""
    );

  if (
    !titleSlug
  ) {
    return 0;
  }

  if (
    titleSlug ===
    requestedSlug
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

  return Boolean(
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
  if (
    !Array.isArray(
      restrictions
    )
  ) {
    return [];
  }

  return restrictions
    .map((item) => {
      if (
        item &&
        typeof item ===
          "object"
      ) {
        return (
          item.name ||
          item.slug ||
          item.alpha2 ||
          ""
        );
      }

      return String(
        item || ""
      );
    })
    .map(
      normalizeLocation
    )
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

  if (
    !restrictions.length
  ) {
    return true;
  }

  if (
    location.includes(
      "remote"
    ) ||
    location.includes(
      "worldwide"
    ) ||
    location.includes(
      "anywhere"
    )
  ) {
    return true;
  }

  for (
    const restriction
    of restrictions
  ) {
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

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}


function salaryMatches(
  sourceJob,
  providerJob
) {
  if (
    sourceJob.minSalary ===
      null &&
    sourceJob.maxSalary ===
      null
  ) {
    return true;
  }

  if (
    providerJob.minSalary ===
      null &&
    providerJob.maxSalary ===
      null
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
    sourceMax ??
    sourceMin;

  const providerUpper =
    providerMax ??
    providerMin;

  return (
    sourceMin <=
      providerUpper &&
    providerMin <=
      sourceUpper
  );
}


/*
 * =========================================================
 * FETCH HELPERS
 * =========================================================
 */

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
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
      () =>
        controller.abort(),
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

          ...(options.headers ||
            {}),
        },
      }
    );
  } finally {
    clearTimeout(
      timer
    );
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
        response.status ===
          429 &&
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

        await sleep(
          waitMs
        );

        continue;
      }

      if (
        !response.ok
      ) {
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
        await sleep(
          250
        );

        continue;
      }
    }
  }

  return {
    ok: false,
    status:
      lastStatus,
    data: null,
  };
}


/*
 * =========================================================
 * HIMALAYAS URL PARSER
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
      job?.companySlug ||
        ""
    );

  const jobName =
    normalizeCompany(
      job?.companyName ||
        ""
    );

  if (
    requested ===
      jobSlug ||
    requested ===
      jobName
  ) {
    return true;
  }

  if (
    jobSlug &&
    (
      requested.includes(
        jobSlug
      ) ||
      jobSlug.includes(
        requested
      )
    )
  ) {
    return true;
  }

  return (
    jaccardSimilarity(
      requested,
      jobSlug ||
        jobName
    ) >=
    0.75
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
    score +=
      0.15;
  }

  return {
    score:
      Math.min(
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

  if (
    companySlug
  ) {
    params.set(
      "company",
      companySlug
    );
  }

  if (
    query
  ) {
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
  const values =
    [];

  function add(
    value
  ) {
    const cleaned =
      normalizeTitle(
        value
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

  add(
    requestedTitle
  );

  add(
    String(
      jobSlug || ""
    )
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
    titleTokenSet(
      requestedTitle
    );

  if (
    tokens.size >= 2
  ) {
    add(
      Array.from(
        tokens
      )
        .slice(
          0,
          4
        )
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

  const allCandidates =
    [];

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
          totalCount !==
            null &&
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
        totalCount !==
          null &&
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
      .map(
        (job) => ({
          job,

          evidence:
            scoreHimalayasCandidate(
              job,

              requestedTitle,

              companySlug,

              jobSlug
            ),
        })
      )
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
  const values =
    [];

  function add(
    value
  ) {
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
   * STRONGEST:
   * actual Greenhouse board token discovered from source.
   */
  add(
    greenhouseBoardToken
  );


  const rawSlug =
    String(
      companySlug || ""
    )
      .trim()
      .toLowerCase();


  const rawName =
    String(
      companyName || ""
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
   * Strong company-derived identifiers.
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

  add(
    rawSlug
  );


  /*
   * Corporate suffix cleanup.
   */

  const withoutCompanySuffix =
    canonicalSlug.replace(
      /-(inc|llc|ltd|limited|corp|corporation|company|co|plc)$/i,
      ""
    );

  add(
    withoutCompanySuffix
  );


  /*
   * Himalayas "-com" suffix.
   */

  const withoutComSuffix =
    canonicalSlug.replace(
      /-com$/i,
      ""
    );

  add(
    withoutComSuffix
  );


  const withoutDotCom =
    rawSlug.replace(
      /\.com$/i,
      ""
    );

  add(
    withoutDotCom
  );


  /*
   * Do NOT add every individual company token.
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
    titleScore * 0.70 +

    locationScore * 0.15 +

    Math.min(
      descriptionScore,
      1
    ) * 0.05 +

    salaryScore * 0.05 +

    identifierConfidence * 0.05;


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
 * EXACT GREENHOUSE VERIFICATION SCORING
 * =========================================================
 */

function scoreExactGreenhouseJob(
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
    const score =
      titleSimilarity(
        titleCandidate,
        providerJob.title
      );

    if (
      score >
      titleScore
    ) {
      titleScore =
        score;

      matchedTitle =
        titleCandidate;
    }
  }

  if (
    titleScore <
    EXACT_GREENHOUSE_TITLE_THRESHOLD
  ) {
    return {
      valid: false,

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

  const locationOk =
    locationMatches(
      sourceRestrictions,
      providerJob.location ||
        ""
    );

  if (
    sourceRestrictions.length &&
    !locationOk
  ) {
    return {
      valid: false,

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
    titleScore * 0.80 +

    locationScore * 0.15 +

    salaryScore * 0.03 +

    Math.min(
      descriptionScore,
      1
    ) * 0.02;


  return {
    valid: true,

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

  if (
    !wanted ||
    !job
  ) {
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
      job.absolute_url ||
        ""
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
 */

async function fetchGreenhouseJobs(
  identifier,
  maxPages = GREENHOUSE_MAX_PAGES
) {
  const allJobs =
    [];

  const seenIds =
    new Set();

  for (
    let page = 1;
    page <= maxPages;
    page++
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "content",
      "true"
    );

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
      if (
        page === 1
      ) {
        return [];
      }

      break;
    }


    const jobs =
      result.data.jobs;

    let addedThisPage =
      0;


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


    if (
      !jobs.length ||
      addedThisPage === 0
    ) {
      break;
    }


    const total =
      numberValue(
        result.data?.meta?.total
      );

    if (
      total !== null &&
      allJobs.length >=
        total
    ) {
      break;
    }


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
 * GREENHOUSE CANDIDATE CONVERTER
 * =========================================================
 */

function greenhouseProviderCandidate(
  job
) {
  return {
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
}


/*
 * =========================================================
 * GREENHOUSE IDENTIFIER CONFIDENCE
 * =========================================================
 */

function getGreenhouseIdentifierConfidence(
  sourceJob,
  identifier,
  isEvidenceBacked = false
) {
  if (
    sourceJob.greenhouseBoardToken &&
    normalizeCompany(
      sourceJob.greenhouseBoardToken
    ) ===
      normalizeCompany(
        identifier
      )
  ) {
    return 1;
  }

  if (
    isEvidenceBacked
  ) {
    return 1;
  }

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

  if (
    normalizedIdentifier ===
      normalizedCompanySlug ||
    normalizedIdentifier ===
      normalizedCompany
  ) {
    return 0.90;
  }

  return 0.75;
}


/*
 * =========================================================
 * GREENHOUSE RESULT BUILDER
 * =========================================================
 */

function buildGreenhouseResult(
  sourceJob,
  job,
  identifier,
  score,
  exactGreenhouseIdMatch
) {
  const applicationUrl =
    typeof job.absolute_url ===
      "string"
      ? job.absolute_url.trim()
      : "";

  if (
    !applicationUrl ||
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
      exactGreenhouseIdMatch
        ? "greenhouse-exact-job-verification"
        : "greenhouse-public-job-board-api",

    applicationUrl,

    matchedJob: {
      title:
        job.title || "",

      location:
        job.location?.name ||
        "",
    },

    score,

    identifier,

    exactGreenhouseIdMatch,
  };
}


/*
 * =========================================================
 * GREENHOUSE BOARD RESOLUTION
 * =========================================================
 *
 * One board at a time.
 *
 * We do NOT blast all possible Greenhouse identifiers
 * simultaneously.
 *
 * IMPORTANT:
 *
 * The Greenhouse jobs endpoint itself is the board
 * verification. We do not make a separate probe request.
 * =========================================================
 */

async function resolveGreenhouseOnBoard(
  sourceJob,
  identifier,
  options = {}
) {
  const {
    evidenceBacked = false,
    maxPages =
      GREENHOUSE_MAX_PAGES,
    allowExactJobId =
      false,
  } = options;


  const jobs =
    await fetchGreenhouseJobs(
      identifier,
      maxPages
    );


  if (
    !jobs.length
  ) {
    console.log(
      "Greenhouse: no public jobs returned for board:",
      identifier
    );

    return null;
  }


  console.log(
    "Greenhouse: public board verified:",
    identifier
  );


  const identifierConfidence =
    getGreenhouseIdentifierConfidence(
      sourceJob,
      identifier,
      evidenceBacked
    );


  /*
   * =======================================================
   * PASS 1
   * Exact Greenhouse job ID
   * =======================================================
   */

  const requestedGreenhouseJobId =
    normalizeGreenhouseJobId(
      sourceJob.greenhouseJobId
    );


  if (
    allowExactJobId &&
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

      const candidate =
        greenhouseProviderCandidate(
          job
        );

      const exactScore =
        scoreExactGreenhouseJob(
          sourceJob,
          candidate,
          identifierConfidence
        );

      if (
        !exactScore.valid
      ) {
        continue;
      }

      const result =
        buildGreenhouseResult(
          sourceJob,

          job,

          identifier,

          exactScore,

          true
        );

      if (result) {
        return result;
      }
    }
  }


  /*
   * =======================================================
   * PASS 2
   * Strict normal matching
   * =======================================================
   */

  let best = null;


  for (
    const job
    of jobs
  ) {
    if (!job) {
      continue;
    }

    const candidate =
      greenhouseProviderCandidate(
        job
      );

    const score =
      scoreProviderJob(
        sourceJob,
        candidate,
        identifierConfidence
      );

    if (
      score.score <
        PROVIDER_MATCH_THRESHOLD
    ) {
      continue;
    }

    if (
      !best ||
      score.score >
        best.score.score
    ) {
      best = {
        job,

        score,

        identifier,
      };
    }
  }


  if (!best) {
    return null;
  }


  return buildGreenhouseResult(
    sourceJob,

    best.job,

    best.identifier,

    best.score,

    false
  );
}


/*
 * =========================================================
 * GREENHOUSE RESOLUTION
 * =========================================================
 *
 * PRIORITY:
 *
 * 1. Known board token + known job ID
 * 2. Known board token + strict title matching
 * 3. Controlled guessed board identifiers
 *
 * IMPORTANT:
 *
 * If known board + exact job ID verifies, return immediately.
 * No other Greenhouse board requests are made.
 * =========================================================
 */

async function resolveGreenhouse(
  sourceJob,
  identifiers
) {
  const knownBoardToken =
    String(
      sourceJob.greenhouseBoardToken ||
        ""
    )
      .trim()
      .toLowerCase();


  const knownJobId =
    normalizeGreenhouseJobId(
      sourceJob.greenhouseJobId
    );


  /*
   * =======================================================
   * PHASE 1
   * Known Greenhouse board token
   * =======================================================
   */

  if (
    knownBoardToken
  ) {
    console.log(
      "Greenhouse: verifying known board token:",
      knownBoardToken
    );


    /*
     * If we know both board + job ID, this is the strongest
     * possible route.
     *
     * If it verifies, STOP immediately.
     */
    if (
      knownJobId
    ) {
      const exactResult =
        await resolveGreenhouseOnBoard(
          sourceJob,

          knownBoardToken,

          {
            evidenceBacked:
              true,

            maxPages:
              GREENHOUSE_MAX_PAGES,

            allowExactJobId:
              true,
          }
        );


      if (
        exactResult &&
        exactResult.exactGreenhouseIdMatch
      ) {
        console.log(
          "Greenhouse: exact board + job ID verified. Stopping search."
        );

        return exactResult;
      }
    }


    /*
     * The board is verified, but either there was no exact
     * ID or exact ID verification failed.
     *
     * We can still search this known board using strict
     * title/location matching.
     */
    const boardResult =
      await resolveGreenhouseOnBoard(
        sourceJob,

        knownBoardToken,

        {
          evidenceBacked:
            true,

          maxPages:
            GREENHOUSE_MAX_PAGES,

          allowExactJobId:
            false,
        }
      );


    if (
      boardResult
    ) {
      console.log(
        "Greenhouse: known board resolved job."
      );

      return boardResult;
    }
  }


  /*
   * =======================================================
   * PHASE 2
   * CONTROLLED FALLBACK IDENTIFIERS
   * =======================================================
   */

  const fallbackIdentifiers =
    Array.from(
      new Set(
        identifiers.filter(
          (identifier) =>
            String(
              identifier || ""
            )
              .trim()
              .toLowerCase() !==
            knownBoardToken
        )
      )
    ).slice(
      0,
      GREENHOUSE_FALLBACK_IDENTIFIER_LIMIT
    );


  if (
    !fallbackIdentifiers.length
  ) {
    return null;
  }


  console.log(
    "Greenhouse: fallback identifiers:",
    fallbackIdentifiers
  );


  /*
   * Do these sequentially, not Promise.all().
   */
  for (
    const identifier
    of fallbackIdentifiers
  ) {
    const result =
      await resolveGreenhouseOnBoard(
        sourceJob,

        identifier,

        {
          evidenceBacked:
            false,

          maxPages:
            GREENHOUSE_FALLBACK_MAX_PAGES,

          allowExactJobId:
            false,
        }
      );


    if (
      result
    ) {
      console.log(
        "Greenhouse: fallback board resolved job:",
        identifier
      );

      return result;
    }
  }


  return null;
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


  for (
    const provider
    of providers
  ) {
    try {
      const result =
        await provider.resolve(
          sourceJob,

          identifiers
        );

      if (
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
      ) {
        return result;
      }
    } catch (error) {
      console.error(
        `Provider ${provider.name} failed:`,
        error?.message ||
          "unknown error"
      );
    }
  }


  return null;
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


    if (
      !originalUrl
    ) {
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


    if (
      !slugData
    ) {
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
     * GREENHOUSE EVIDENCE
     * =====================================================
     */

    let greenhouseEvidence =
      extractGreenhouseApplicationEvidence(
        himalayasJob?.applicationLink ||
        himalayasJob?.applicationUrl ||
        ""
      );


    if (
      !greenhouseEvidence ||
      (
        !greenhouseEvidence.boardToken &&
        !greenhouseEvidence.jobId
      )
    ) {
      try {
        greenhouseEvidence =
          await discoverGreenhouseEvidenceFromHimalayasPage(
            originalUrl
          );
      } catch (error) {
        console.error(
          "Greenhouse HTML evidence discovery failed:",
          error?.message ||
            "unknown error"
        );

        greenhouseEvidence =
          null;
      }
    }


    /*
     * =====================================================
     * BUILD SOURCE JOB
     * =====================================================
     */

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
     * IMPORTANT:
     *
     * No Himalayas fallback.
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
