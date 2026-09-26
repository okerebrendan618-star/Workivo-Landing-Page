const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const HIMALAYAS_HOSTS = new Set([
  "himalayas.app",
  "www.himalayas.app",
]);

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

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[^a-z0-9$€£./:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(value = "") {
  const country = normalize(value);

  const aliases = {
    norway: "norway",
    japan: "japan",
    turkey: "turkey",
    france: "france",
    mexico: "mexico",
    vietnam: "vietnam",
  };

  return aliases[country] || country;
}

function normalizeCompany(value = "") {
  return normalize(value)
    .replace(/[^a-z0-9]/g, "")
    .replace(/inc$/, "")
    .replace(/llc$/, "");
}

function normalizeTitle(value = "") {
  return normalize(value)
    .replace(/\b(analyst|specialist|evaluator)\b/g, (word) => word)
    .trim();
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function arraysContainValue(values, expected) {
  if (!expected) return true;

  if (!Array.isArray(values)) {
    return false;
  }

  const wanted = normalizeCountry(expected);

  return values.some(
    (value) => normalizeCountry(value) === wanted
  );
}

function titleMatches(actual, expected) {
  const a = normalizeTitle(actual);
  const b = normalizeTitle(expected);

  if (!a || !b) return false;

  if (a === b) return true;

  /*
   * Allows small naming differences such as:
   * AI Response Evaluator
   * AI Response Evaluation Analyst
   */
  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));

  let matches = 0;

  for (const word of aWords) {
    if (bWords.has(word)) {
      matches++;
    }
  }

  const denominator = Math.max(aWords.size, bWords.size);

  return denominator > 0 && matches / denominator >= 0.65;
}

function companyMatches(actual, expected) {
  return (
    normalizeCompany(actual) ===
    normalizeCompany(expected)
  );
}

/*
 * ---------------------------------------------------------
 * VERIFIED SOURCE RECORDS
 * ---------------------------------------------------------
 *
 * These are NOT guesses.
 *
 * A record is only used when the supplied job metadata matches
 * the verified job fingerprint.
 *
 * This is deliberately conservative.
 */
const VERIFIED_APPLICATIONS = [
  {
    id: "imerit-norway-ai-response-evaluation-analyst",

    company: "iMerit",

    title: "AI Response Evaluation Analyst",

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

    /*
     * Extra identifiers make the match safer.
     */
    requiredDescriptionTerms: [
      "AI-generated responses",
      "image",
      "accuracy",
      "relevance",
      "Bokmål",
    ],
  },
];

function descriptionMatches(description, requiredTerms = []) {
  if (!requiredTerms.length) {
    return true;
  }

  const text = normalize(description);

  let matches = 0;

  for (const term of requiredTerms) {
    if (text.includes(normalize(term))) {
      matches++;
    }
  }

  /*
   * Require most of the fingerprint to match.
   */
  return matches >= Math.ceil(requiredTerms.length * 0.6);
}

function matchesVerifiedApplication(job, record) {
  if (!companyMatches(job.company, record.company)) {
    return false;
  }

  if (!titleMatches(job.title, record.title)) {
    return false;
  }

  if (
    job.location &&
    !arraysContainValue([job.location], record.location)
  ) {
    return false;
  }

  if (
    job.language &&
    normalize(job.language) !== normalize(record.language)
  ) {
    return false;
  }

  if (
    job.employmentType &&
    normalize(job.employmentType) !==
      normalize(record.employmentType)
  ) {
    return false;
  }

  const salary = numberValue(job.minSalary);

  if (
    salary !== null &&
    record.minSalary !== null &&
    salary !== record.minSalary
  ) {
    return false;
  }

  if (
    job.currency &&
    normalize(job.currency) !== normalize(record.currency)
  ) {
    return false;
  }

  if (
    job.salaryPeriod &&
    normalize(job.salaryPeriod) !==
      normalize(record.salaryPeriod)
  ) {
    return false;
  }

  if (
    !descriptionMatches(
      job.description,
      record.requiredDescriptionTerms
    )
  ) {
    return false;
  }

  return true;
}

function extractJobSlug(url) {
  try {
    const parsed = new URL(url);

    const match = parsed.pathname.match(
      /^\/companies\/([^/]+)\/jobs\/([^/]+)\/?$/i
    );

    if (!match) {
      return null;
    }

    return {
      companySlug: decodeURIComponent(match[1]),
      jobSlug: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

async function getHimalayasJob(companySlug, jobSlug) {
  /*
   * We use Himalayas' public structured API.
   *
   * We are NOT scraping the Himalayas webpage.
   */
  const endpoint =
    "https://himalayas.app/jobs/api/search?" +
    new URLSearchParams({
      company: companySlug,
      q: jobSlug.replace(/[-_]+/g, " "),
      page: "1",
    }).toString();

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Himalayas API returned ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.jobs)) {
    return null;
  }

  /*
   * Find the closest title match.
   */
  const wantedTitle = jobSlug
    .replace(/[-_]+/g, " ");

  const exact = data.jobs.find((job) =>
    titleMatches(job.title, wantedTitle)
  );

  return exact || data.jobs[0] || null;
}

async function resolveApplication(job) {
  for (const record of VERIFIED_APPLICATIONS) {
    if (matchesVerifiedApplication(job, record)) {
      return {
        resolved: true,
        applyUrl: record.applicationUrl,
        method: record.method,
        source: record.source,
        verificationId: record.id,
      };
    }
  }

  return null;
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

    const slugData = extractJobSlug(originalUrl);

    if (!slugData) {
      return res.status(200).json({
        originalUrl,
        finalUrl: originalUrl,
        applyUrl: originalUrl,
        resolved: false,
        method: "fallback-invalid-himalayas-url",
      });
    }

    /*
     * Get structured job data from Himalayas API.
     */
    const himalayasJob = await getHimalayasJob(
      slugData.companySlug,
      slugData.jobSlug
    );

    if (!himalayasJob) {
      return res.status(200).json({
        originalUrl,
        finalUrl: originalUrl,
        applyUrl: originalUrl,
        resolved: false,
        method: "fallback-job-not-found",
      });
    }

    /*
     * For now, location/language/duration are supplied by the
     * caller when available.
     *
     * The public Himalayas API gives us location restrictions,
     * salary, employment type and description.
     */
    const job = {
      company: himalayasJob.companyName,
      title: himalayasJob.title,

      location:
        Array.isArray(himalayasJob.locationRestrictions) &&
        himalayasJob.locationRestrictions.length
          ? himalayasJob.locationRestrictions[0]
          : "",

      employmentType:
        himalayasJob.employmentType || "",

      minSalary:
        himalayasJob.minSalary,

      maxSalary:
        himalayasJob.maxSalary,

      currency:
        himalayasJob.currency || "",

      salaryPeriod:
        himalayasJob.salaryPeriod || "",

      description:
        himalayasJob.description || "",

      /*
       * Optional values can be passed by Workivo later.
       */
      language:
        req.query?.language || "",

      durationWeeks:
        req.query?.durationWeeks
          ? Number(req.query.durationWeeks)
          : null,
    };

    const resolved = await resolveApplication(job);

    if (resolved) {
      return res.status(200).json({
        originalUrl,

        finalUrl: resolved.applyUrl,

        applyUrl: resolved.applyUrl,

        resolved: true,

        method: resolved.method,

        source: resolved.source,

        verificationId: resolved.verificationId,

        matchedJob: {
          company: job.company,
          title: job.title,
          location: job.location,
          employmentType: job.employmentType,
          minSalary: job.minSalary,
          maxSalary: job.maxSalary,
          currency: job.currency,
          salaryPeriod: job.salaryPeriod,
        },
      });
    }

    /*
     * SAFE FALLBACK
     *
     * Never send the user to an unverified application URL.
     */
    return res.status(200).json({
      originalUrl,

      finalUrl: originalUrl,

      applyUrl: originalUrl,

      resolved: false,

      method: "fallback-unverified-source",

      matchedJob: {
        company: job.company,
        title: job.title,
        location: job.location,
      },
    });
  } catch (error) {
    console.error("resolve-apply error:", error);

    return res.status(500).json({
      error: "Resolver failed",

      message:
        error?.message ||
        "Unknown resolver error",
    });
  }
}
