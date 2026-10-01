/*

* =========================================================
* WORKIVO — LIGHTWEIGHT DIRECT APPLICATION RESOLVER
* =========================================================
* PURPOSE:
* Convert a Himalayas job URL into the employer’s actual
* application URL.
* IMPORTANT:
* This resolver intentionally does NOT identify or resolve
* Greenhouse, Lever, Ashby, Workday, etc.
* We do not care which ATS a company uses.
* Flow:
* Himalayas URL

 ↓

* Himalayas Jobs API

 ↓

* Find matching job

 ↓

* Read applicationLink

 ↓

* If external → return it

 ↓

* If Himalayas/internal → inspect job page for an
* external application URL

 ↓

* If nothing verifiable → unresolved
* This is deliberately lightweight for Workivo launch.
* =========================================================
    */

/*

* =========================================================
* CONFIG
* =========================================================
    */

const HIMALAYAS_API_TIMEOUT = 7000;

const HIMALAYAS_PAGE_TIMEOUT = 7000;

const HIMALAYAS_MAX_TITLE_QUERIES = 4;

const HIMALAYAS_MAX_SEARCH_PAGES = 3;

/*

* =========================================================
* BASIC URL HELPERS
* =========================================================
    */

function isHttpUrl(value = “”) {
try {
const parsed = new URL(
String(value || “”).trim()
);

return (
  parsed.protocol === "http:" ||
  parsed.protocol === "https:"
);

} catch {
return false;
}
}

function isHimalayasUrl(value = “”) {
try {
const parsed = new URL(
String(value || “”).trim()
);

const hostname =
  parsed.hostname
    .toLowerCase()
    .replace(/^www\./, "");
return (
  hostname === "himalayas.app" ||
  hostname.endsWith(".himalayas.app")
);

} catch {
return false;
}
}

/*

* =========================================================
* FETCH HELPERS
* =========================================================
    */

function sleep(ms) {
return new Promise(
(resolve) =>
setTimeout(resolve, ms)
);
}

async function fetchWithTimeout(
url,
options = {},
timeoutMs = 7000
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
…options,

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
timeoutMs = 7000,
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
    await sleep(500);
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
    await sleep(300);
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

async function fetchHtml(
url,
timeoutMs = HIMALAYAS_PAGE_TIMEOUT
) {
try {
const response =
await fetchWithTimeout(
url,
{
headers: {
Accept:
“text/html,application/xhtml+xml”,
},
},
timeoutMs
);

if (!response.ok) {
  return null;
}
const html =
  await response.text();
return html || null;

} catch {
return null;
}
}

/*

* =========================================================
* NORMALIZATION
* =========================================================
    */

function normalize(value = “”) {
return String(value)
.toLowerCase()
.replace(/<[^>]*>/g, “ “)
.replace(
/&/gi,
“&”
)
.replace(
/'|'/gi,
“’”
)
.replace(
/"/gi,
‘”’
)
.replace(
//|//gi,
“/”
)
.replace(
/ /gi,
“ “
)
.replace(
/[^\p{L}\p{N}\s]+/gu,
“ “
)
.replace(
/\s+/g,
“ “
)
.trim();
}

function normalizeCompany(
value = “”
) {
return normalize(value)
.replace(
/\b(incorporated|inc|llc|ltd|limited|corp|corporation|co|company|plc)\b/g,
“ “
)
.replace(
/[^a-z0-9]+/g,
“”
)
.trim();
}

function normalizeTitle(
value = “”
) {
return normalize(value)
.replace(
/\b(full time|fulltime|part time|parttime|remote|hybrid|onsite|on site)\b/g,
“ “
)
.replace(
/\s+/g,
“ “
)
.trim();
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
const requestedTitle =
  jobSlug
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\s+\d{4,}$/g,
      ""
    )
    .trim();
return {
  companySlug,
  jobSlug,
  requestedTitle,
};

} catch {
return null;
}
}

/*

* =========================================================
* TITLE QUERY BUILDER
* =========================================================
    */

function buildTitleQueries(
requestedTitle = “”,
jobSlug = “”
) {
const queries = [];

function add(value) {
const cleaned =
normalizeTitle(value);

if (
  cleaned &&
  !queries.includes(cleaned)
) {
  queries.push(cleaned);
}

}

add(
requestedTitle
);

add(
String(jobSlug || “”)
.replace(
/[-]+\d{4,}$/g,
“”
)
.replace(
/[-]+/g,
“ “
)
);

/*

* Shorter title query.
* Example:
* “Senior Software Engineer Backend Platform”
* becomes:
* “Senior Software Engineer Backend”
    */
    const tokens =
    normalizeTitle(
    requestedTitle
    )
    .split(/\s+/)
    .filter(Boolean);

if (
tokens.length >= 3
) {
add(
tokens
.slice(
0,
4
)
.join(” “)
);
}

/*

* Remove common seniority words for another
* broad-but-controlled search.
    */
    const broad =
    tokens.filter(
    (token) =>
    ![
    “senior”,
    “sr”,
    “junior”,
    “jr”,
    “staff”,
    “principal”,
    “lead”,
    “manager”,
    “director”,
    “head”,
    ].includes(
    token
    )
    );

if (
broad.length >= 2
) {
add(
broad
.slice(
0,
4
)
.join(” “)
);
}

return queries.slice(
0,
HIMALAYAS_MAX_TITLE_QUERIES
);
}

/*

* =========================================================
* TITLE SIMILARITY
* =========================================================
    */

function titleSimilarity(
firstValue = “”,
secondValue = “”
) {
const first =
normalizeTitle(
firstValue
);

const second =
normalizeTitle(
secondValue
);

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
new Set(
first
.split(/\s+/)
.filter(Boolean)
);

const secondTokens =
new Set(
second
.split(/\s+/)
.filter(Boolean)
);

if (
!firstTokens.size ||
!secondTokens.size
) {
return 0;
}

let intersection = 0;

for (
const token
of firstTokens
) {
if (
secondTokens.has(
token
)
) {
intersection++;
}
}

const union =
firstTokens.size +
secondTokens.size -
intersection;

if (!union) {
return 0;
}

return (
intersection /
union
);
}

/*

* =========================================================
* COMPANY MATCH
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

const jobCompanySlug =
normalizeCompany(
job?.companySlug ||
“”
);

const jobCompanyName =
normalizeCompany(
job?.companyName ||
“”
);

return Boolean(
requested ===
jobCompanySlug ||
requested ===
jobCompanyName
);
}

/*

* =========================================================
* EXTERNAL APPLICATION URL CHECK
* =========================================================
* We deliberately don’t care whether this is Greenhouse,
* Lever, Ashby, Workday, a company careers page, etc.
* Any legitimate external HTTPS/HTTP application URL
* is acceptable.
* =========================================================
    */

function isExternalApplicationUrl(
value = “”
) {
if (
!isHttpUrl(value)
) {
return false;
}

try {
const parsed =
new URL(
String(value).trim()
);

const hostname =
  parsed.hostname
    .toLowerCase()
    .replace(/^www\./, "");
/*
 * Never send the user back into Himalayas.
 */
if (
  hostname ===
    "himalayas.app" ||
  hostname.endsWith(
    ".himalayas.app"
  )
) {
  return false;
}
/*
 * Reject obvious non-application resources.
 */
if (
  /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2)$/i.test(
    parsed.pathname
  )
) {
  return false;
}
return true;

} catch {
return false;
}
}

/*

* =========================================================
* NORMALIZE APPLICATION URL
* =========================================================
    */

function cleanApplicationUrl(
value = “”
) {
if (
!value
) {
return “”;
}

let url =
String(value)
.trim();

/*

* Decode common JSON/HTML escaping.
    */
    url =
    url
    .replace(
    /\u002F/gi,
    “/”
    )
    .replace(
    /\//g,
    “/”
    )
    .replace(
    /\u0026/gi,
    “&”
    )
    .replace(
    /&/gi,
    “&”
    )
    .replace(
    /"/gi,
    ‘”’
    );

/*

* Remove surrounding quotes.
    */
    url =
    url.replace(
    /^[”’]|[”’]$/g,
    “”
    );

return url.trim();
}

/*

* =========================================================
* HIMALAYAS API SEARCH
* =========================================================
    */

async function searchHimalayasPage({
companySlug = “”,
query = “”,
page = 1,
}) {
const params =
new URLSearchParams();

if (
query
) {
params.set(
“q”,
query
);
}

if (
companySlug
) {
params.set(
“company”,
companySlug
);
}

params.set(
“page”,
String(page)
);

params.set(
“sort”,
“relevant”
);

const endpoint =
“https://himalayas.app/jobs/api/search?” +
params.toString();

return fetchJson(
endpoint,
{},
HIMALAYAS_API_TIMEOUT,
1
);
}

/*

* =========================================================
* FIND HIMALAYAS JOB
* =========================================================
    */

async function findHimalayasJob(
companySlug,
jobSlug,
requestedTitle
) {
const queries =
buildTitleQueries(
requestedTitle,
jobSlug
);

const candidates =
[];

const seen =
new Set();

function addJobs(
jobs
) {
if (
!Array.isArray(jobs)
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
  candidates.push(
    job
  );
}

}

/*

* Search with title variants.
    */
    for (
    const query
    of queries
    ) {
    for (
    let page = 1;
    page <=
    HIMALAYAS_MAX_SEARCH_PAGES;
    page++
    ) {
    const result =
    await searchHimalayasPage({
    companySlug,
    query,
    page,
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
    addJobs(
    jobs
    );
    /*
    * Exact title first.
        */
        const exact =
        jobs.find(
        (job) =>
        companyMatches(
        job,
        companySlug
        ) &&
        normalizeTitle(
        job.title || “”
        ) ===
        normalizeTitle(
        requestedTitle
        )
        );
    if (exact) {
    return exact;
    }
    if (
    !jobs.length ||
    jobs.length < 20
    ) {
    break;
    }
    }
    }

/*

* If exact matching did not find it, rank the
* candidates we collected.
    */
    if (
    !candidates.length
    ) {
    return null;
    }

candidates.sort(
(a, b) =>
titleSimilarity(
requestedTitle,
b.title || “”
) -
titleSimilarity(
requestedTitle,
a.title || “”
)
);

const best =
candidates[0];

if (
!best
) {
return null;
}

const similarity =
titleSimilarity(
requestedTitle,
best.title || “”
);

/*

* We don’t accept a weak title match.
    */
    if (
    similarity >=
    60
    ) {
    return best;
    }

return null;
}

/*

* =========================================================
* EXTERNAL LINKS FROM HIMALAYAS PAGE
* =========================================================
* This is only a fallback.
* We are NOT trying to understand ATS providers.
* We simply look for an external URL attached to an
* “Apply” / “Application” style link or exposed in the
* page data.
* =========================================================
    */

function decodeHtmlEntities(
value = “”
) {
return String(value || “”)
.replace(
/&/gi,
“&”
)
.replace(
/"/gi,
‘”’
)
.replace(
/'|'/gi,
“’”
)
.replace(
//|//gi,
“/”
)
.replace(
/ /gi,
“ “
);
}

function discoverExternalApplicationUrl(
html = “”
) {
if (
!html
) {
return null;
}

const normalizedHtml =
html
.replace(
/\u002F/gi,
“/”
)
.replace(
/\//g,
“/”
)
.replace(
/\u0026/gi,
“&”
)
.replace(
/&/gi,
“&”
)
.replace(
/"/gi,
‘”’
);

/*

    ⸻
* 1.	Anchor tags near Apply/Application wording
    ⸻

*/

const anchorRegex =
/<a\b([^>]?)href\s=\s*”’”’>([\s\S]*?)</a>/gi;

let match;

const candidates =
[];

while (
(match =
anchorRegex.exec(
normalizedHtml
)) !== null
) {
const attributes =
${match[1] || ""} ${ match[3] || "" };

const href =
  cleanApplicationUrl(
    decodeHtmlEntities(
      match[2] || ""
    )
  );
const text =
  normalize(
    match[4] || ""
  );
if (
  !isExternalApplicationUrl(
    href
  )
) {
  continue;
}
let score = 0;
/*
 * Strong signals.
 */
if (
  /\bapply\b/i.test(
    text
  )
) {
  score += 10;
}
if (
  /\bapplication\b/i.test(
    text
  )
) {
  score += 8;
}
if (
  /\bapply\b/i.test(
    attributes
  )
) {
  score += 6;
}
/*
 * URL-path signals.
 */
if (
  /\/(apply|application|careers|career|jobs|job)\b/i.test(
    href
  )
) {
  score += 5;
}
/*
 * Don't return random external links.
 */
if (
  score > 0
) {
  candidates.push({
    url: href,
    score,
  });
}

}

if (
candidates.length
) {
candidates.sort(
(a, b) =>
b.score -
a.score
);

return candidates[0].url;

}

/*

    ⸻
* 2.	External URLs inside page JSON/data.
    ⸻
* This is intentionally broad but conservative.
* We only accept URLs that look like application/job
* destinations.
    ⸻

*/

const urlRegex =
/https?://[^\s”’<>\]+/gi;

const urls =
normalizedHtml.match(
urlRegex
) || [];

const urlCandidates =
[];

for (
const rawUrl
of urls
) {
const url =
cleanApplicationUrl(
rawUrl
);

if (
  !isExternalApplicationUrl(
    url
  )
) {
  continue;
}
let score = 0;
if (
  /\/(apply|application|careers|career|jobs|job)\b/i.test(
    url
  )
) {
  score += 6;
}
if (
  /greenhouse|lever\.co|ashbyhq|workday|smartrecruiters|workable|recruitee/i.test(
    url
  )
) {
  score += 4;
}
if (
  score > 0
) {
  urlCandidates.push({
    url,
    score,
  });
}

}

if (
urlCandidates.length
) {
urlCandidates.sort(
(a, b) =>
b.score -
a.score
);

return urlCandidates[0].url;

}

return null;
}

/*

* =========================================================
* PAGE FALLBACK
* =========================================================
    */

async function discoverApplicationFromHimalayasPage(
originalUrl
) {
const html =
await fetchHtml(
originalUrl
);

if (
!html
) {
return null;
}

return discoverExternalApplicationUrl(
html
);
}

/*

* =========================================================
* APPLICATION DESTINATION RESOLUTION
* ========================================================= */

async function resolveApplicationDestination(
originalUrl,
himalayasJob
) {
/*

    ⸻
* FIRST CHOICE:
* Himalayas API applicationLink
    ⸻

*/

const apiApplicationLink =
cleanApplicationUrl(
himalayasJob?.applicationLink ||
himalayasJob?.applicationUrl ||
“”
);

if (
isExternalApplicationUrl(
apiApplicationLink
)
) {
console.log(
“Direct application link found in Himalayas API:”,
apiApplicationLink
);

return {
  url:
    apiApplicationLink,
  method:
    "himalayas-application-link",
};

}

/*

    ⸻
* SECOND CHOICE:
* Inspect Himalayas job page for an external
* application URL.
    ⸻

*/

const discoveredUrl =
await discoverApplicationFromHimalayasPage(
originalUrl
);

if (
isExternalApplicationUrl(
discoveredUrl
)
) {
console.log(
“External application link discovered from Himalayas page:”,
discoveredUrl
);

return {
  url:
    discoveredUrl,
  method:
    "himalayas-page-external-link",
};

}

/*

    ⸻
* NOTHING VERIFIED
    ⸻

*/

console.log(
“No external application destination could be verified.”
);

return null;
}

/*

* =========================================================
* RESPONSE BUILDERS
* =========================================================
    */

function buildResolvedResponse(
originalUrl,
application,
sourceJob
) {
return {
originalUrl,

finalUrl:
  application.url,
applyUrl:
  application.url,
resolved:
  true,
provider:
  "direct",
method:
  application.method,
matchedJob: {
  title:
    sourceJob.title ||
    "",
  company:
    sourceJob.company ||
    "",
  location:
    sourceJob.locationRestrictions ||
    [],
},
source: {
  company:
    sourceJob.company ||
    "",
  title:
    sourceJob.title ||
    "",
  requestedTitle:
    sourceJob.requestedTitle ||
    "",
  employmentType:
    sourceJob.employmentType ||
    "",
  minSalary:
    sourceJob.minSalary ??
    null,
  maxSalary:
    sourceJob.maxSalary ??
    null,
  currency:
    sourceJob.currency ||
    "",
  salaryPeriod:
    sourceJob.salaryPeriod ||
    "",
  himalayasLookup:
    true,
  directApplication:
    true,
},
checkedProviders: [
  "direct",
],

};
}

function buildUnresolvedResponse(
originalUrl,
sourceJob,
method =
“direct-application-not-found”
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
    sourceJob.company ||
    "",
  title:
    sourceJob.title ||
    "",
  requestedTitle:
    sourceJob.requestedTitle ||
    "",
  employmentType:
    sourceJob.employmentType ||
    "",
  minSalary:
    sourceJob.minSalary ??
    null,
  maxSalary:
    sourceJob.maxSalary ??
    null,
  currency:
    sourceJob.currency ||
    "",
  salaryPeriod:
    sourceJob.salaryPeriod ||
    "",
  himalayasLookup:
    Boolean(
      sourceJob.himalayasLookup
    ),
  directApplication:
    false,
},
checkedProviders: [
  "direct",
],

};
}

/*

* =========================================================
* JSON RESPONSE HELPER
* =========================================================
    */

function sendJson(
res,
status,
payload
) {
res.status(status);

res.setHeader(
“Content-Type”,
“application/json; charset=utf-8”
);

return res.json(
payload
);
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

    ⸻
* OPTIONS
    ⸻

*/

if (
req.method ===
“OPTIONS”
) {
return sendJson(
res,
200,
{}
);
}

/*

    ⸻
* GET ONLY
    ⸻

*/

if (
req.method !==
“GET”
) {
return sendJson(
res,
405,
{
error:
“Method not allowed”,
}
);
}

try {
/*
* —————————————————–
* URL PARAMETER
* —————————————————–
*/

const originalUrl =
  String(
    req.query?.url ||
    ""
  ).trim();
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
 * -----------------------------------------------------
 * VALIDATE URL
 * -----------------------------------------------------
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
 * -----------------------------------------------------
 * HIMALAYAS ONLY
 * -----------------------------------------------------
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
 * -----------------------------------------------------
 * PARSE JOB URL
 * -----------------------------------------------------
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
        "direct",
      ],
    }
  );
}
/*
 * -----------------------------------------------------
 * OPTIONAL OVERRIDES
 * -----------------------------------------------------
 */
const requestedTitle =
  String(
    req.query?.title ||
    slugData.requestedTitle ||
    ""
  ).trim();
const requestedCompany =
  String(
    req.query?.company ||
    slugData.companySlug ||
    ""
  ).trim();
/*
 * -----------------------------------------------------
 * FIND JOB IN HIMALAYAS API
 * -----------------------------------------------------
 */
let himalayasJob =
  null;
try {
  himalayasJob =
    await findHimalayasJob(
      slugData.companySlug,
      slugData.jobSlug,
      requestedTitle
    );
} catch (error) {
  console.error(
    "Himalayas job lookup failed:",
    error?.message ||
      "unknown error"
  );
  himalayasJob =
    null;
}
/*
 * -----------------------------------------------------
 * BUILD SOURCE DATA
 * -----------------------------------------------------
 */
const sourceJob = {
  company:
    himalayasJob?.companyName ||
    requestedCompany ||
    "",
  title:
    himalayasJob?.title ||
    requestedTitle ||
    "",
  requestedTitle:
    requestedTitle ||
    "",
  companySlug:
    himalayasJob?.companySlug ||
    slugData.companySlug ||
    "",
  description:
    himalayasJob?.description ||
    himalayasJob?.excerpt ||
    "",
  employmentType:
    himalayasJob?.employmentType ||
    "",
  minSalary:
    himalayasJob?.minSalary ??
    null,
  maxSalary:
    himalayasJob?.maxSalary ??
    null,
  currency:
    himalayasJob?.currency ||
    "",
  salaryPeriod:
    himalayasJob?.salaryPeriod ||
    "",
  locationRestrictions:
    Array.isArray(
      himalayasJob?.locationRestrictions
    )
      ? himalayasJob.locationRestrictions
      : [],
  applicationLink:
    himalayasJob?.applicationLink ||
    "",
  himalayasLookup:
    Boolean(
      himalayasJob
    ),
};
/*
 * -----------------------------------------------------
 * IMPORTANT FALLBACK:
 *
 * Even if the API search failed to find the job,
 * the actual Himalayas page may still exist.
 *
 * We therefore inspect the page directly.
 *
 * We do NOT send the user to Himalayas.
 * -----------------------------------------------------
 */
if (
  !himalayasJob
) {
  console.log(
    "Himalayas API did not return a matching job. Trying direct page inspection."
  );
  const discoveredUrl =
    await discoverApplicationFromHimalayasPage(
      originalUrl
    );
  if (
    isExternalApplicationUrl(
      discoveredUrl
    )
  ) {
    return sendJson(
      res,
      200,
      {
        originalUrl,
        finalUrl:
          discoveredUrl,
        applyUrl:
          discoveredUrl,
        resolved:
          true,
        provider:
          "direct",
        method:
          "himalayas-page-external-link",
        matchedJob: {
          title:
            requestedTitle,
          company:
            requestedCompany,
        },
        source: {
          company:
            requestedCompany,
          title:
            requestedTitle,
          requestedTitle,
          himalayasLookup:
            false,
          directApplication:
            true,
        },
        checkedProviders: [
          "direct",
        ],
      }
    );
  }
  return sendJson(
    res,
    200,
    buildUnresolvedResponse(
      originalUrl,
      sourceJob,
      "himalayas-job-not-found"
    )
  );
}
/*
 * -----------------------------------------------------
 * RESOLVE DIRECT APPLICATION DESTINATION
 * -----------------------------------------------------
 */
const application =
  await resolveApplicationDestination(
    originalUrl,
    himalayasJob
  );
/*
 * -----------------------------------------------------
 * VERIFIED EXTERNAL APPLICATION
 * -----------------------------------------------------
 */
if (
  application &&
  isExternalApplicationUrl(
    application.url
  )
) {
  return sendJson(
    res,
    200,
    buildResolvedResponse(
      originalUrl,
      application,
      sourceJob
    )
  );
}
/*
 * -----------------------------------------------------
 * NO VERIFIED EXTERNAL DESTINATION
 * -----------------------------------------------------
 */
return sendJson(
  res,
  200,
  buildUnresolvedResponse(
    originalUrl,
    sourceJob,
    "direct-application-not-found"
  )
);

} catch (error) {
console.error(
“Direct application resolver error:”,
error
);

return sendJson(
  res,
  500,
  {
    error:
      "Direct application resolver failed",
    message:
      error?.message ||
      "Unknown resolver error",
  }
);

}
}
