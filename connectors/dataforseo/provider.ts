import { defineProvider } from "@shared/core";
import { zDataforseoCredentials } from "./schema/auth.ts";

/**
 * DataForSEO (dataforseo.com) — SEO and marketing data behind ONE prepaid
 * account and ONE response envelope: live Google / Bing / Yahoo / YouTube
 * SERPs, keyword volumes, DataForSEO Labs keyword and domain research,
 * backlinks, technologies and Whois, content analysis, AI-visibility
 * (LLM answers and mentions), Amazon and Google Shopping, Google Play and
 * App Store, Google Business and reviews, on-page audits, plus free
 * dictionaries. Ported from monid-services MR !313 (`feat/dataforseo-
 * provider` @ 56649af6, MON-295); 216 of v1's 218 defs (design D9).
 *
 * WIRE (design D3): every product is `POST /v3/<api>/<product>/...` with
 * a JSON array of ONE task object, and answers HTTP 200 (401/402/404/500
 * excepted) with the verdict in the body — `status_code` at the top and
 * on `tasks[0]` (20000 ok, 20100 task created, 40106 partial results,
 * 4xxxx/5xxxx failure). A declarative doc settles on the transport status
 * alone, so the provider-level `lifecycle.start` below wraps the body
 * into the one-task array and turns an in-band failure into v1's
 * synthesized status (`providerHttpStatus` keeps their 200) — the
 * minimax / opoint posture. The 25 queued products override `start` and
 * add `poll` (task_post + task_get, design D6); the 49 free dictionaries
 * override `start` to filter the fetched list (design D7); the one GET
 * resolver overrides `start` with the plain relay.
 *
 * BILLING (design D4): the body's top-level `cost` is the exact USD
 * debited from the prepaid balance (v1 drill 2026-09-18: 19 calls, the
 * sum of `cost` == the balance delta), so the pool IS dollars and
 * `usage.consolidate` reads it as the claim — plus the task_post charge a
 * queued run stashed in its own state (task_get is free). The rate card
 * (`consumes.amount`) is the account's price list (`GET /v3/appendix/
 * user_data` `price`, 2026-09-18, receipts the same day): a flat price
 * per call, a page price per block of N results (`every: N`), or a
 * request fee plus a per-row price. The generic `evidence` keys the
 * count by the doc's own model; `estimate` is per endpoint (D5).
 *
 * OUTPUT (v1 decision 2026-09-18, design D8): the caller gets
 * `tasks[0].result` as DataForSEO returns it; the envelope (`version`,
 * `time`, `cost`, task `id`, `path`, the echoed `data`) stays behind.
 * Billing reads the RAW body (consolidate / evidence run first). No
 * output-overflow artifact exists here (v1 spilled > 256 KB into
 * `data.json`): a depth-200 SERP (~300 KB) is returned inline.
 *
 * Timeouts mirror services/workflows/endpointExecution/config.yml
 * (dataforseo): live calls block up to 120 s upstream (50401 past that);
 * the queued products state their own 30-minute window + 10 s cadence.
 */
export default defineProvider({
    name: "dataforseo",
    meta: {
        displayName: "DataForSEO",
        summary: "SEO and marketing data: live SERPs, keyword volumes, " +
            "backlinks, domain research, business and app-store data, and " +
            "AI-answer mentions.",
        description: "SEO and marketing data for agents — live Google, " +
            "Bing, Yahoo, and YouTube SERPs, keyword volumes and " +
            "difficulty, ranked keywords and competitors for any domain, " +
            "backlinks, on-page audits, Google Business profiles and " +
            "reviews, App Store and Google Play listings, Amazon and " +
            "Google Shopping products, and brand mentions inside ChatGPT, " +
            "Gemini, and Perplexity answers. Pay per call from one " +
            "prepaid balance, no subscription: a flat price per call, a " +
            "price per page of results, or a request fee plus a per-row " +
            "price, always settled at the exact amount the vendor " +
            "debited. Most calls answer live within seconds; Google Jobs, " +
            "reverse image search, Baidu, Naver, Seznam, Ads " +
            "Transparency, app-store and Google Business review " +
            "listings, and Trustpilot / Tripadvisor queue a task and " +
            "the run polls it (about a minute at the high priority the " +
            "connector requests). Free dictionaries list the location " +
            "codes, filter fields, category codes, and model names the " +
            "other endpoints take.",
        homepageUrl: "https://dataforseo.com",
        docsUrl: "https://docs.dataforseo.com/v3/",
        categories: ["seo", "web-search", "geo"],
        notes: [
            "Every response is the vendor's envelope; the endpoint " +
            "returns `tasks[0].result` (an array of result rows) and the " +
            "envelope — version, time, cost, task id, the echoed request " +
            "— stays behind. Billing reads the raw body.",
            "The vendor answers HTTP 200 with the verdict in the body. A " +
            "`status_code` other than 20000 (ok), 20100 (task created), " +
            "or 40106 (partial results, charged only for the pages " +
            "returned) settles as a provider error with zero usage: " +
            "40100 → 401, 40200 / 40210 → 402, 40104 / 40201 / 40203 / " +
            "40204 → 403, 40102 / 40401 → 404, 40105 → 410, 40202 / " +
            "40205 / 40206 / 40209 → 429, 405xx (invalid field) → 400, " +
            "anything else → 502. Unknown body fields are rejected here " +
            "before any spend.",
            "`postback_url`, `postback_data`, `pingback_url`, `tag`, and " +
            "`priority` are not accepted: callbacks would deliver results " +
            "outside billing, and the connector sets the queue priority " +
            "itself (high, about one minute, twice the standard price).",
            "Large results (a depth-200 SERP is about 300 KB, a 1,000-row " +
            "Labs page more) are returned inline; ask for the depth or " +
            "limit you need.",
        ],
    },
    auth: {
        credentials: zDataforseoCredentials,
        /**
         * HTTP Basic (design D2): `Authorization: Basic base64(login:
         * password)`. No preset speaks Basic and `btoa` is not a
         * whitelisted global of a closed term, so the UTF-8 + base64
         * encoding is written out here (the opoint posture for a
         * non-standard Authorization value: inline, no preset).
         */
        inject: ({ data }) => {
            const raw = data.params.login + ":" + data.params.password;
            const bytes: number[] = [];
            for (let i = 0; i < raw.length; i++) {
                let code = raw.charCodeAt(i);
                if (code >= 0xd800 && code < 0xdc00 && i + 1 < raw.length) {
                    const low = raw.charCodeAt(i + 1);
                    if (low >= 0xdc00 && low < 0xe000) {
                        code = 0x10000 + ((code - 0xd800) << 10) +
                            (low - 0xdc00);
                        i++;
                    }
                }
                if (code < 0x80) {
                    bytes.push(code);
                } else if (code < 0x800) {
                    bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
                } else if (code < 0x10000) {
                    bytes.push(
                        0xe0 | (code >> 12),
                        0x80 | ((code >> 6) & 0x3f),
                        0x80 | (code & 0x3f),
                    );
                } else {
                    bytes.push(
                        0xf0 | (code >> 18),
                        0x80 | ((code >> 12) & 0x3f),
                        0x80 | ((code >> 6) & 0x3f),
                        0x80 | (code & 0x3f),
                    );
                }
            }
            const alphabet =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let encoded = "";
            for (let i = 0; i < bytes.length; i += 3) {
                const b0 = bytes[i];
                const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
                const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
                const triple = (b0 << 16) | (b1 << 8) | b2;
                encoded += alphabet[(triple >> 18) & 63] +
                    alphabet[(triple >> 12) & 63] +
                    (i + 1 < bytes.length
                        ? alphabet[(triple >> 6) & 63]
                        : "=") +
                    (i + 2 < bytes.length ? alphabet[triple & 63] : "=");
            }
            return {
                ...data.request,
                headers: {
                    ...data.request.headers,
                    Authorization: "Basic " + encoded,
                },
            };
        },
    },
    request: { baseUrl: "https://api.dataforseo.com" },
    // mirrors services/workflows/endpointExecution/config.yml (dataforseo):
    // request 130 s / run 130 s; the queued products override run + poll
    timeouts: { requestMs: 130_000, runMs: 130_000 },
    usage: {
        /** THE credit system (design D4): one prepaid USD balance, every
         *  receipt in dollars — so the pool is dollars (exa / apify). */
        credits: { default: { label: "US dollars" } },
        /**
         * GENERIC quantities (design D4), keyed by the doc's own model:
         *   - PER_UNIT · RESULT with `every` > 1 — a page-billed product
         *     (SERPs, reviews, app searches): the vendor charges per page
         *     of `every` results, so the count is the results the caller
         *     asked for — `depth`, or `max_crawl_pages` pages when that
         *     asks for more (v1 `pageEstimate`); the receipt corrects a
         *     partial delivery (40106).
         *   - PER_UNIT · RESULT (`every` 1) or COMPOSITE `rows` — a
         *     per-row product: `result[0].items` length, or the
         *     `items_count` the row carries when `items` was not returned
         *     (v1 `resultItemCount`; drill: `items_count × per_row +
         *     request fee == cost` on Labs, backlinks, content, business).
         *   - PER_CALL / FREE — nothing to count.
         */
        evidence: ({ data, utils }) => {
            const model = data.usage.model;
            if (model.kind === "PER_CALL" || model.kind === "FREE") {
                return { counts: {} };
            }
            const every = model.kind === "PER_UNIT" ? model.every ?? 1 : 1;
            if (every > 1) {
                const depth = utils.json.optionalNum(
                    data.input.body ?? {},
                    "$.depth",
                ) ?? 0;
                const crawl = utils.json.optionalNum(
                    data.input.body ?? {},
                    "$.max_crawl_pages",
                ) ?? 1;
                return { counts: { RESULT: Math.max(depth, crawl * every) } };
            }
            const key = model.kind === "PER_UNIT" ? model.unit : "rows";
            const items = utils.json.optionalGet(
                data.output,
                "$.tasks[0].result[0].items",
            );
            const declared = utils.json.optionalGet(
                data.output,
                "$.tasks[0].result[0].items_count",
            );
            const rows = Array.isArray(items)
                ? items.length
                : typeof declared === "number"
                ? declared
                : 0;
            return { counts: { [key]: rows } };
        },
        /**
         * THE vendor's meter (design D4): the body's top-level `cost` is
         * the USD debited by this exchange; a queued run adds the
         * task_post charge its start stashed (`state.data.postCost`) since
         * the task_get body reports 0. Absent on both → no claim (the
         * derived fold settles). A free dictionary claims nothing — a
         * FREE doc declares no pool, and a nonzero claim on one is a
         * loud engine error by design.
         */
        consolidate: ({ data, utils }) => {
            const credits: Record<string, number> = {};
            if (data.usage.model.kind === "FREE") return { credits };
            const cost = utils.json.optionalNum(data.output, "$.cost");
            const post = utils.json.optionalNum(
                data.lifecycle?.state ?? {},
                "$.data.postCost",
            );
            if (cost !== undefined || post !== undefined) {
                credits.default = (cost ?? 0) + (post ?? 0);
            }
            return { credits };
        },
    },
    lifecycle: {
        /**
         * The LIVE relay (v1 `liveStart`, design D3): POST the validated
         * body as the one-task array, then read the verdict. Three
         * outcomes, all COMPLETED:
         *   - vendor non-2xx           → relayed as data (zero usage)
         *   - 200 + 20000 / 40106      → relayed verbatim
         *   - 200 + any other verdict  → SYNTHESIZED status (v1's table),
         *     `providerHttpStatus` records that their exchange was a 200
         * An absent verdict (`tasks: null` on a top-level 50304) is a
         * failure too — a malformed 200 must not reach the billing gate.
         */
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({ body: [data.input.body ?? {}] });
            if (res.status < 200 || res.status >= 300) {
                logger.warn("dataforseo non-2xx — returning as data", {
                    status: res.status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const code = utils.json.optionalNum(
                res.body,
                "$.tasks[0].status_code",
            ) ?? utils.json.optionalNum(res.body, "$.status_code");
            if (code === 20000 || code === 40106) {
                return { kind: "COMPLETED", httpStatus: 200, output: res.body };
            }
            logger.warn("dataforseo envelope error — synthesizing a status", {
                code: code ?? null,
            });
            const verdict = code ?? 50000;
            let httpStatus = 502;
            if (verdict === 40100) httpStatus = 401;
            if (verdict === 40200 || verdict === 40210) httpStatus = 402;
            if (
                verdict === 40104 || verdict === 40201 || verdict === 40203 ||
                verdict === 40204
            ) httpStatus = 403;
            if (verdict === 40102 || verdict === 40401) httpStatus = 404;
            if (verdict === 40105) httpStatus = 410;
            if (
                verdict === 40202 || verdict === 40205 || verdict === 40206 ||
                verdict === 40209
            ) httpStatus = 429;
            if (verdict >= 40500 && verdict < 40600) httpStatus = 400;
            return {
                kind: "COMPLETED",
                httpStatus,
                providerHttpStatus: res.status,
                output: res.body,
            };
        },
    },
    output: {
        /**
         * Presentation only (design D8) — runs AFTER consolidate and
         * evidence, which read the RAW envelope: the caller gets
         * `tasks[0].result` (v1 `providerFormatOutput`), an empty array
         * when the task carried no rows.
         */
        fromResponse: ({ data, utils }) => {
            const rows = utils.json.optionalGet(
                data.output,
                "$.tasks[0].result",
            );
            return Array.isArray(rows) ? rows : [];
        },
        /**
         * THE error-digestion hook — runs ONLY on provider errors, after
         * zero-usage forcing. One envelope for every failure: the task's
         * `status_message` / `status_code` when a task exists, the
         * top-level pair otherwise (`tasks: null`), raw body kept.
         */
        fromError: ({ data, utils }) => {
            const taskMessage = utils.json.optionalGet(
                data.output,
                "$.tasks[0].status_message",
            );
            const topMessage = utils.json.optionalGet(
                data.output,
                "$.status_message",
            );
            const taskCode = utils.json.optionalGet(
                data.output,
                "$.tasks[0].status_code",
            );
            const topCode = utils.json.optionalGet(
                data.output,
                "$.status_code",
            );
            const message =
                typeof taskMessage === "string" && taskMessage !== ""
                    ? taskMessage
                    : typeof topMessage === "string" && topMessage !== ""
                    ? topMessage
                    : "DataForSEO API error";
            const code = typeof taskCode === "number" ? taskCode : topCode;
            return {
                message,
                ...(typeof code === "number" ? { status_code: code } : {}),
                raw: data.output,
            };
        },
    },
});
