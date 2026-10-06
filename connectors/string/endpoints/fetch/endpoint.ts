import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFetchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/fetch` — fetch any URL as clean, LLM-ready content, choosing
 * the fetch strategy (plain request vs. full browser) and proxy class
 * (standard vs. premium residential) automatically per target.
 *
 * BILLING, from String's own published docs (pricing.mdx "Usage — per
 * 1,000 requests" and api-reference/overview.mdx "Billed request type",
 * read 2026-09-22): the rate is one of four flat per-request lines,
 * named by the RESPONSE header `x-billed-request-type` —
 * `request_standard` / `request_premium` / `browser_standard` /
 * `browser_premium`. This is OUTPUT-determined, not input-gated: the
 * request can force the browser path (`executeJS`, `requireWSS`,
 * `screenshot`, `actions`) but the proxy class (standard vs. premium) is
 * always the target site's own anti-bot posture, invisible beforehand.
 * Quoted at the Growth-tier rate throughout, matching the search
 * endpoint's own pricing decision.
 *
 * WHY LIFECYCLE, NOT DECLARATIVE: `x-billed-request-type` is a response
 * HEADER, and this DSL's declarative path drops headers before
 * `usage.evidence` ever runs — `engine/transport.ts`'s `sniffDecode`
 * takes only `response.body`, and `usage.evidence`'s envelope
 * (`zEnvelopeData`) carries `output` (the decoded body) but no headers
 * field; confirmed by reading both, not assumed. `lifecycle.start` DOES
 * see response headers (`utils.request()` returns `{status, headers,
 * body}`), so this endpoint uses a single-tick lifecycle (no `poll` —
 * `/fetch` is a synchronous vendor call, no job id — the non-polling
 * COMPLETED branch) and stashes the header on `state.data`, the
 * documented billing-signal channel (`data.lifecycle.state.data`) for
 * `usage.evidence` to read.
 *
 * ESTIMATE: the browser-vs-request axis is knowable from the request
 * (`executeJS`/`requireWSS`/`screenshot`/`actions` force browser); the
 * proxy-class axis is not, so this promises the cheaper (standard) proxy
 * on whichever strategy the request implies — an honest floor, not a
 * worst case, for an output-determined quantity.
 *
 * SETTLE: reads `x-billed-request-type` off `state.data` (stashed by
 * `lifecycle.start`). A transport that does not surface response headers
 * (the DSL's own documented fallback, `TransportResponse.headers` being
 * optional) settles zero rather than guessing which of the four lines
 * fired.
 */
export default defineEndpoint({
    meta: {
        displayName: "String Fetch",
        summary: "Fetch any URL as clean, LLM-ready content.",
        description: "Executes an HTTP/HTTPS request to a URL and " +
            "returns the result, automatically choosing between a " +
            "lightweight request-based fetch and full browser " +
            "execution. " +
            "`format` controls the response shape (JSON envelope, raw " +
            "bytes, or Markdown); `executeJS`/`requireWSS` force " +
            "browser rendering; `screenshot`/`actions` capture an " +
            "image or drive the page. A `google.com/search` URL is " +
            "answered as structured search results (billed at the " +
            "Search rate) rather than fetched as HTML.",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/fetch",
        categories: ["web-scraping"],
        notes: [
            "AI structured extraction (`jsonSchema`) is not exposed by " +
            "this connector — its surcharge scales with page and " +
            "schema size with no published flat rate.",
            "String can still bill a destination TLS/SSL failure when " +
            "an upstream attempt already did billable work; that `502` " +
            "names its class in `x-billed-request-type`. This connector " +
            "settles every non-2xx at zero usage, so such a charge is not " +
            "passed through.",
        ],
    },
    request: { method: "POST", path: "/fetch" },
    // Browser-rendered fetches (antibot retries, CAPTCHA solving) run far
    // longer than a plain request; no published SLA, so this budgets
    // generously rather than truncating a slow-but-successful fetch.
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    input: { schema: { body: zFetchBody } },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            const billedType = res.headers["x-billed-request-type"];
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
                state: { data: { billedRequestType: billedType ?? null } },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request_standard: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "request-based, standard proxy",
                    description: "a plain fetch on a standard proxy",
                    consumes: { credit: "default", amount: 0.0002 },
                },
                request_premium: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "request-based, premium proxy",
                    description: "a plain fetch on a premium " +
                        "(residential) proxy",
                    consumes: { credit: "default", amount: 0.002 },
                },
                browser_standard: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "browser-based, standard proxy",
                    description: "a browser-rendered fetch on a " +
                        "standard proxy",
                    consumes: { credit: "default", amount: 0.001 },
                },
                browser_premium: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "browser-based, premium proxy",
                    description: "a browser-rendered fetch on a " +
                        "premium (residential) proxy",
                    consumes: { credit: "default", amount: 0.004 },
                },
            },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const browserForced = body.executeJS === true ||
                body.requireWSS === true || body.screenshot === true ||
                (body.actions?.length ?? 0) > 0;
            return {
                counts: {
                    [browserForced ? "browser_standard" : "request_standard"]:
                        1,
                },
            };
        },
        evidence: ({ data, utils }) => {
            // closed-term fn: the billed-type vocabulary is inlined
            // rather than read off a module-level const (the compiler
            // rejects a free identifier reference from inside a hook fn).
            const known = [
                "request_standard",
                "request_premium",
                "browser_standard",
                "browser_premium",
            ];
            const billedType = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.billedRequestType",
            );
            if (typeof billedType === "string" && known.includes(billedType)) {
                return { counts: { [billedType]: 1 } };
            }
            return { counts: {} };
        },
    },
});
