import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Workivo Apply Link Resolver
 *
 * This endpoint is separate from the existing Job Matching
 * pipeline. It receives a Himalayas job URL, loads the job
 * page from the Workivo backend, follows redirects, and
 * attempts to discover an external application URL.
 *
 * If no external application URL can be discovered, it
 * safely falls back to the original Himalayas URL.
 */
app.get("/api/resolve-apply", async (req, res) => {
  const rawUrl = req.query.url;

  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return res.status(400).json({
      error: "Missing job URL.",
    });
  }

  let jobUrl: URL;

  try {
    jobUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({
      error: "Invalid job URL.",
    });
  }

  /**
   * Only allow Himalayas URLs.
   * This prevents this endpoint from becoming an arbitrary
   * server-side URL fetcher.
   */
  const allowedHosts = new Set([
    "himalayas.app",
    "www.himalayas.app",
  ]);

  if (!allowedHosts.has(jobUrl.hostname.toLowerCase())) {
    return res.status(400).json({
      error: "Only Himalayas job URLs can be resolved.",
    });
  }

  try {
    const response = await fetch(jobUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; Workivo Apply Resolver/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    const finalUrl = response.url || jobUrl.toString();
    const html = await response.text();

    /**
     * If Himalayas itself redirected the request to another
     * domain, that destination is already the application URL.
     */
    try {
      const finalParsedUrl = new URL(finalUrl);

      if (
        !allowedHosts.has(
          finalParsedUrl.hostname.toLowerCase(),
        )
      ) {
        return res.json({
          originalUrl: jobUrl.toString(),
          finalUrl,
          applyUrl: finalUrl,
          resolved: true,
          method: "redirect",
        });
      }
    } catch {
      // Continue with HTML inspection.
    }

    let applyUrl: string | null = null;

    /**
     * Look for an anchor containing "Apply" text.
     *
     * Example:
     * <a href="https://company.com/apply">Apply now</a>
     */
    const applyLinkRegex =
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?apply(?:\s+now)?[\s\S]{0,500}?<\/a>/gi;

    let match: RegExpExecArray | null;

    while ((match = applyLinkRegex.exec(html)) !== null) {
      const candidate = match[1]?.trim();

      if (!candidate) {
        continue;
      }

      try {
        const absoluteCandidate = new URL(candidate, finalUrl);

        if (
          !allowedHosts.has(
            absoluteCandidate.hostname.toLowerCase(),
          )
        ) {
          applyUrl = absoluteCandidate.toString();
          break;
        }
      } catch {
        // Ignore malformed links.
      }
    }

    /**
     * Second lightweight attempt:
     * search the HTML for external URLs containing
     * application-related words.
     */
    if (!applyUrl) {
      const externalUrlRegex =
        /https?:\/\/[^\s"'<>\\]+/gi;

      const urls = html.match(externalUrlRegex) || [];

      for (const candidate of urls) {
        try {
          const parsedCandidate = new URL(candidate);

          if (
            !allowedHosts.has(
              parsedCandidate.hostname.toLowerCase(),
            ) &&
            /apply|application|careers|jobs/i.test(candidate)
          ) {
            applyUrl = parsedCandidate.toString();
            break;
          }
        } catch {
          // Ignore malformed URLs.
        }
      }
    }

    /**
     * No external destination was discovered.
     * Keep Himalayas as the safe fallback.
     */
    return res.json({
      originalUrl: jobUrl.toString(),
      finalUrl,
      applyUrl: applyUrl || jobUrl.toString(),
      resolved: Boolean(applyUrl),
      method: applyUrl ? "html-link" : "fallback",
    });
  } catch (error) {
    logger.warn(
      {
        err: error,
        jobUrl: jobUrl.toString(),
      },
      "Failed to resolve Himalayas application URL",
    );

    /**
     * The resolver must never break Job Matching.
     */
    return res.json({
      originalUrl: jobUrl.toString(),
      applyUrl: jobUrl.toString(),
      resolved: false,
      method: "fallback",
    });
  }
});

app.use("/api", router);

export default app;
