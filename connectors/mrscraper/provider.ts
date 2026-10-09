import { defineProvider, presets } from "@shared/core";

/**
 * MrScraper (mrscraper.com) — live web scraping, ported from
 * monid-services `adaptors/mrscraper`. Two products behind one API token:
 *
 *   - the MARKETPLACE: fixed-price site scrapers (Google SERP and
 *     verticals, AI-search answers, e-commerce product / review / search
 *     pages, travel rates and fares, TikTok / YouTube media),
 *     one `POST /api/<site>/<kind>/sync` each on
 *     `https://sync.scraper.mrscraper.com` (TripAdvisor on the
 *     vendor-designated `tvlk` host), Bearer auth, answering the envelope
 *     `{success, message, data, tokenUsage}` — the MAJORITY, so it is what
 *     this provider declares;
 *   - the PLAYGROUND: seven presets over ONE operation, `POST
 *     https://api.mrscraper.com/`, selected by query flags, `x-api-token`
 *     auth, answering a flat body with `token_usage` — a different host,
 *     auth, envelope and rate, so each playground endpoint overrides the
 *     provider's baseUrl, inject, toRequest, model, estimate, evidence,
 *     consolidate and fromResponse (suzanne D3 posture).
 *
 * Everything is a single synchronous POST; nothing polls.
 *
 * BILLING (design D3). The vendor meters everything in TOKENS: a
 * marketplace scraper draws its fixed catalog count per run (echoed as
 * `tokenUsage`), the playground draws runtime + bandwidth (+ AI) per run
 * (echoed as `token_usage`). The pool is that token; every marketplace
 * line pins v1's per-scraper count (the vendor's marketplace catalog,
 * https://app.mrscraper.com/marketplace, behind login, 2026-09-07,
 * corrected by v1's drills). The echo is the vendor's CLAIM —
 * but only on a run that returned usable data: an empty result or a "soft
 * failure" (2xx with `success: false`, no `data`, an empty `data`, or
 * `data.status: "FAIL"`) records ZERO (owner decision 2026-09-17, v1's
 * posture), so the consolidate claims nothing on them and the generic
 * evidence counts 0 (design D4). The v1 `isEmptyMarketplaceResult` rule
 * is stated verbatim in both hooks — a closed term cannot share it.
 *
 * OUTPUT (design D5): the caller gets the inner `data` (v1's unwrap;
 * owner decision 2026-09-17); the meter leaves with the envelope. No
 * `fromError`: vendor errors are `{message, error}` already.
 */
export default defineProvider({
    name: "mrscraper",
    meta: {
        displayName: "MrScraper",
        summary:
            "Live web scraping: any URL to HTML, Markdown, screenshot, or JSON, plus 50+ site scrapers.",
        description: "Live web scraping for agents: fetch any URL as raw " +
            "HTML, Markdown, a screenshot, or AI-extracted JSON, walk " +
            "paginated listings, and pull typed data from 50+ fixed-price " +
            "site scrapers across e-commerce (Amazon, Walmart, Shein, " +
            "Lazada, Taobao, AutoZone), travel (Agoda, Booking.com, " +
            "Expedia, Trip.com, airline fares), Google Search, Flights, and " +
            "Hotels, AI-search answers (Gemini, GPT), and TikTok, YouTube, " +
            "media. Anti-bot bypass and residential proxies " +
            "are handled server-side; one flat token price per site " +
            "scraper; structured fields instead of page parsing. Every " +
            "call scrapes the target site live in a real browser, so " +
            "responses take tens of seconds (typically 10-60 s, some " +
            "scrapers 100 s+) and can fail when the target site blocks.",
        homepageUrl: "https://mrscraper.com",
        docsUrl: "https://docs.mrscraper.com",
        categories: ["web-extraction", "web-search"],
        notes: [
            "Every call scrapes the target site live in a real browser: " +
            "expect tens of seconds, and a run can fail when the target " +
            "site blocks.",
            "A failed request (non-2xx) draws no tokens. A 2xx with no " +
            "usable data (empty result, success false, or data.status " +
            "FAIL) is recorded as zero here; the vendor may still have " +
            "drawn its price for it.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://sync.scraper.mrscraper.com" },
    // mirrors services/workflows/endpointExecution/config.yml (mrscraper):
    // request 120s, run 120s — marketplace scrapers render pages; the
    // playground and the vendor's slow scrapers override to 330s.
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** THE credit system (design D3): MrScraper meters ONE pool of
         *  plan tokens per account, drawn by every scraper and playground
         *  run, so the pool is that unit and the id is `default`. The
         *  $/token (v1: $1 per 1,000, the public overage rate) is the
         *  broker card's job, not the doc's. */
        credits: {
            default: {
                label: "MrScraper tokens",
                description: "the account's plan tokens; each site scraper " +
                    "states its fixed draw, the playground draws by " +
                    "runtime, bandwidth, and AI usage",
            },
        },
        /** The vendor's OWN claim (design D27) on a USABLE result: the
         *  marketplace envelope echoes `tokenUsage` — pluck it (read +
         *  strip, one motion) and claim it only when the body carries
         *  data a caller can use; an empty result or a soft failure
         *  (design D4) claims NOTHING, so the derived fold — evidence 0 —
         *  settles the run at zero. Entry OMITTED when the meter is
         *  absent (never `?? 0`). The playground docs override this
         *  (their meter is `token_usage` on a flat body). */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.tokenUsage",
            );
            const success = utils.json.optionalGet(rest, "$.success");
            const inner = utils.json.optionalGet(rest, "$.data");
            let usable = success !== false && inner !== undefined &&
                inner !== null;
            if (usable && Array.isArray(inner)) {
                usable = inner.length > 0;
            }
            if (
                usable && typeof inner === "object" && inner !== null &&
                !Array.isArray(inner)
            ) {
                usable = Object.keys(inner).length > 0 &&
                    inner.status !== "FAIL";
            }
            return {
                credits: {
                    ...(usable && typeof value === "number"
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
        /** The generic QUANTITIES default (design D4): a marketplace
         *  scraper is one billed run when — and only when — its `data`
         *  is usable (the same rule the consolidate applies to the
         *  claim), so every marketplace doc's `RESULT` line counts 1 or
         *  0. The review scrapers and the playground docs override with
         *  their own basis (empty `reviews[]`; the token meter). */
        evidence: ({ data, utils }) => {
            const counts: Record<string, number> = {};
            const model = data.usage.model;
            if (model.kind !== "PER_UNIT" || model.unit !== "RESULT") {
                return { counts };
            }
            const success = utils.json.optionalGet(data.output, "$.success");
            const inner = utils.json.optionalGet(data.output, "$.data");
            let usable = success !== false && inner !== undefined &&
                inner !== null;
            if (usable && Array.isArray(inner)) {
                usable = inner.length > 0;
            }
            if (
                usable && typeof inner === "object" && inner !== null &&
                !Array.isArray(inner)
            ) {
                usable = Object.keys(inner).length > 0 &&
                    inner.status !== "FAIL";
            }
            counts.RESULT = usable ? 1 : 0;
            return { counts };
        },
    },
    output: {
        /** The marketplace envelope `{success, message, data}` unwraps to
         *  its inner `data` (v1 unwrapMarketplaceEnvelope; owner decision
         *  2026-09-17, design D5). A body without a `data` key (a few
         *  scrapers answer bespoke shapes) passes through. Runs after
         *  evidence, on the consolidated body — the meter is already
         *  gone. */
        fromResponse: ({ data, utils }) => {
            const inner = utils.json.optionalGet(data.output, "$.data");
            return inner === undefined ? data.output : inner;
        },
    },
});
