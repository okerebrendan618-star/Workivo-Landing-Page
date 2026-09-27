const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const HIMALAYAS_HOSTS = new Set([
  "himalayas.app",
  "www.himalayas.app",
]);

/*
 * ---------------------------------------------------------
 * BASIC HELPERS
 * ---------------------------------------------------------
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

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompany(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9]/g, "")
    .replace(/inc$/, "")
    .replace(/llc$/, "")
    .replace(/ltd$/, "");
}

function normalizeTitle(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

function normalizeLanguage(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

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

function numbersEqual(a, b) {
  const first = numberValue(a);
  const second = numberValue(b);

  if (first === null || second === null) {
    return false;
  }

  return first === second;
}

/*
 * ---------------------------------------------------------
 * VERIFIED APPLICATION RECORDS
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * These are exact, manually verified fingerprints.
 *
 * We DO NOT guess these.
 * We DO NOT generate Scholars IDs.
 * We DO NOT assume all iMerit jobs use Scholars.
 *
 * A record is only used when the incoming job fingerprint
 * matches the verified record.
 */

const VERIFIED_APPLICATIONS = [
  {
    id:
      "imerit-ai-response-evaluation-analyst-norway-bokmal",

    company: "iMerit",

    title:
      "AI Response Evaluation Analyst",

    location: "Norway",

    language: "Bokmål",

    employmentType: "Contractor",

    durationWeeks: 3,

    minSalary: 35,

    maxSalary: 35,

    currency: "USD",

    salaryPeriod: "hourly",

    applicationUrl:
      "https://app.scholars.net/jobs/655",

    source: "iMerit Careers",

    method: "verified-employer-source",
  },
];

/*
 * ---------------------------------------------------------
 * MATCHING
 * ---------------------------------------------------------
 */

function companyMatches(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  return (
    normalizeCompany(actual) ===
    normalizeCompany(expected)
  );
}

function titleMatches(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  const a = normalizeTitle(actual);
  const b = normalizeTitle(expected);

  if (!a || !b) {
    return false;
  }

  /*
   * Exact title match.
   */
  if (a === b) {
    return true;
  }

  /*
   * Controlled fallback for small naming differences.
   *
   * Example:
   *
   * "AI Response Evaluation Analyst"
   * "AI Response Evaluation Specialist"
   *
   * We still require a strong word overlap.
   */

  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));

  let matches = 0;

  for (const word of aWords) {
    if (bWords.has(word)) {
      matches++;
    }
  }

  const denominator = Math.max(
    aWords.size,
    bWords.size
  );

  return (
    denominator > 0 &&
    matches / denominator >= 0.8
  );
}

function locationMatches(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  return (
    normalizeCountry(actual) ===
    normalizeCountry(expected)
  );
}

function languageMatches(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  return (
    normalizeLanguage(actual) ===
    normalizeLanguage(expected)
  );
}

function employmentTypeMatches(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  return (
    normalize(actual) ===
    normalize(expected)
  );
}

/*
 * ---------------------------------------------------------
 * FINGERPRINT MATCH
 * ---------------------------------------------------------
 *
 * REQUIRED FIELDS:
 *
 * company
 * title
 * location
 * language
 * employmentType
 * durationWeeks
 * salary
 * currency
 * salaryPeriod
 *
 * We intentionally require the important identifying fields.
 *
 * This prevents:
 *
 * iMerit + similar title
 *
 * from accidentally becoming:
 *
 * Scholars 655
 */

function matchesVerifiedApplication(
  job,
  record
) {
  if (
    !companyMatches(
      job.company,
      record.company
    )
  ) {
    return false;
  }

  if (
    !titleMatches(
      job.title,
      record.title
    )
  ) {
    return false;
  }

  if (
    !locationMatches(
      job.location,
      record.location
    )
  ) {
    return false;
  }

  if (
    !languageMatches(
      job.language,
      record.language
    )
  ) {
    return false;
  }

  if (
    !employmentTypeMatches(
      job.employmentType,
      record.employmentType
    )
  ) {
    return false;
  }

  if (
    !numbersEqual(
      job.durationWeeks,
      record.durationWeeks
    )
  ) {
    return false;
  }

  if (
    !numbersEqual(
      job.minSalary,
      record.minSalary
    )
  ) {
    return false;
  }

  if (
    !numbersEqual(
      job.maxSalary,
      record.maxSalary
    )
  ) {
    return false;
  }

  if (
    normalize(job.currency) !==
    normalize(record.currency)
  ) {
    return false;
  }

  if (
    normalize(job.salaryPeriod) !==
    normalize(record.salaryPeriod)
  ) {
    return false;
  }

  return true;
}

/*
 * ---------------------------------------------------------
 * DEBUGGING
 * ---------------------------------------------------------
 *
 * Instead of simply saying "no match", this tells us
 * exactly which fingerprint fields were missing.
 */

function getMissingFingerprintFields(job) {
  const missing = [];

  if (!job.company) {
    missing.push("company");
  }

  if (!job.title) {
    missing.push("title");
  }

  if (!job.location) {
    missing.push("location");
  }

  if (!job.language) {
    missing.push("language");
  }

  if (!job.employmentType) {
    missing.push("employmentType");
  }

  if (
    job.durationWeeks === null ||
    job.durationWeeks === undefined ||
    job.durationWeeks === ""
  ) {
    missing.push("durationWeeks");
  }

  if (
    job.minSalary === null ||
    job.minSalary === undefined ||
    job.minSalary === ""
  ) {
    missing.push("minSalary");
  }

  if (!job.currency) {
    missing.push("currency");
  }

  if (!job.salaryPeriod) {
    missing.push("salaryPeriod");
  }

  return missing;
}

/*
 * ---------------------------------------------------------
 * FIND VERIFIED APPLICATION
 * ---------------------------------------------------------
 */

function resolveApplication(job) {
  for (const record of VERIFIED_APPLICATIONS) {
    if (
      matchesVerifiedApplication(
        job,
        record
      )
    ) {
      return record;
    }
  }

  return null;
}

/*
 * ---------------------------------------------------------
 * MAIN HANDLER
 * ---------------------------------------------------------
 */

export default async function handler(
  req,
  res
) {
  /*
   * CORS / preflight
   */
  if (req.method === "OPTIONS") {
    return res
      .status(200)
      .json({});
  }

  /*
   * Only GET is supported.
   */
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({
        error: "Method not allowed",
      });
  }

  try {
    /*
     * -----------------------------------------------------
     * ORIGINAL HIMALAYAS URL
     * -----------------------------------------------------
     */

    const originalUrl =
      req.query?.url;

    if (!originalUrl) {
      return res
        .status(400)
        .json({
          error:
            "Missing url parameter",
        });
    }

    if (!isHttpUrl(originalUrl)) {
      return res
        .status(400)
        .json({
          error:
            "Invalid URL",
        });
    }

    if (!isHimalayasUrl(originalUrl)) {
      return res
        .status(400)
        .json({
          error:
            "Only Himalayas URLs are supported",
        });
    }

    /*
     * -----------------------------------------------------
     * READ JOB FINGERPRINT
     * -----------------------------------------------------
     *
     * These values come from Workivo.
     *
     * The resolver DOES NOT try to discover them by taking
     * the first location from Himalayas.
     */

    const job = {
      company:
        req.query?.company || "",

      title:
        req.query?.title || "",

      location:
        req.query?.location || "",

      language:
        req.query?.language || "",

      employmentType:
        req.query?.employmentType || "",

      durationWeeks:
        req.query?.durationWeeks
          ? Number(
              req.query.durationWeeks
            )
          : null,

      minSalary:
        req.query?.minSalary
          ? Number(
              req.query.minSalary
            )
          : null,

      maxSalary:
        req.query?.maxSalary
          ? Number(
              req.query.maxSalary
            )
          : null,

      currency:
        req.query?.currency || "",

      salaryPeriod:
        req.query?.salaryPeriod || "",
    };

    /*
     * -----------------------------------------------------
     * CHECK WHETHER WE HAVE ENOUGH INFORMATION
     * -----------------------------------------------------
     */

    const missingFields =
      getMissingFingerprintFields(
        job
      );

    /*
     * We don't attempt a guess.
     *
     * If important identifying information is missing,
     * safely fall back to Himalayas.
     */

    if (missingFields.length > 0) {
      return res
        .status(200)
        .json({
          originalUrl,

          finalUrl:
            originalUrl,

          applyUrl:
            originalUrl,

          resolved: false,

          method:
            "fallback-missing-fingerprint",

          missingFingerprintFields:
            missingFields,

          matchedJob: job,
        });
    }

    /*
     * -----------------------------------------------------
     * TRY VERIFIED APPLICATION MATCH
     * -----------------------------------------------------
     */

    const resolved =
      resolveApplication(job);

    if (resolved) {
      return res
        .status(200)
        .json({
          originalUrl,

          finalUrl:
            resolved.applicationUrl,

          applyUrl:
            resolved.applicationUrl,

          resolved: true,

          method:
            resolved.method,

          source:
            resolved.source,

          verificationId:
            resolved.id,

          matchedJob: {
            company:
              job.company,

            title:
              job.title,

            location:
              job.location,

            language:
              job.language,

            employmentType:
              job.employmentType,

            durationWeeks:
              job.durationWeeks,

            minSalary:
              job.minSalary,

            maxSalary:
              job.maxSalary,

            currency:
              job.currency,

            salaryPeriod:
              job.salaryPeriod,
          },
        });
    }

    /*
     * -----------------------------------------------------
     * SAFE FALLBACK
     * -----------------------------------------------------
     *
     * If we don't have a verified mapping:
     *
     * DO NOT GUESS.
     *
     * Keep the original Himalayas application URL.
     */

    return res
      .status(200)
      .json({
        originalUrl,

        finalUrl:
          originalUrl,

        applyUrl:
          originalUrl,

        resolved: false,

        method:
          "fallback-unverified-fingerprint",

        matchedJob: job,
      });
  } catch (error) {
    console.error(
      "resolve-apply error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "Resolver failed",

        message:
          error?.message ||
          "Unknown resolver error",
      });
  }
}
