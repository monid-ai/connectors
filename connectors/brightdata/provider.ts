import { defineProvider } from "@shared/core";
import { zBrightdataCredentials } from "./schema/auth.ts";

/**
 * Bright Data — web access infrastructure. Two products on ONE wire path
 * (`POST https://api.brightdata.com/request`, `Authorization: Bearer`),
 * told apart by the ZONE the request names: a `serp` zone answers search
 * engine result pages as parsed JSON, an `unblocker` zone answers arbitrary
 * URLs past bot detection. Both are synchronous.
 *
 * ZONE IS CREDENTIAL MATERIAL (design D1). The zone names a resource inside
 * the key-holder's account, so the caller cannot know it and must not set
 * it. It rides in `auth.credentials` beside the key and each endpoint's own
 * `auth.inject` merges the right one into the body at egress — the
 * contactout posture, and the reason there is no provider-level `inject`:
 * the two endpoints share a wire path, so the request alone cannot tell
 * which zone belongs to it.
 *
 * NO VENDOR METER (design D3). Verified live 2026-09-23 against a real key:
 * a successful `POST /request` returns the fetched payload and nothing
 * else — no credits field, no cost field, no usage header. `x-brd-debug`
 * (opt-in via `debug: true`) reports traffic counters, but it is a debug
 * aid rather than a billing receipt, it is a HEADER — which `record`
 * drops — and it is not documented as stable. So there is no
 * `usage.consolidate`; the derived fold IS the bill, and — eyes open — no
 * `usage.mismatch.derived` cross-check exists for Bright Data. The tests
 * pin the rates as literals (the contactout / clay D7a posture).
 *
 * A FAILED UNLOCK IS A PROVIDER ERROR, READ OFF BRIGHT DATA'S OWN HEADERS
 * (design D4). A request Bright Data cannot accept answers a real non-2xx
 * (400 `zone "x" not found`, 401 `Invalid token`) and the engine zero-bills
 * it. Once a request reaches the unlocker, though, the outer status is 200
 * whatever happened, and the verdict rides in headers instead — per Bright
 * Data's error-code reference, EVERY unlocker failure carries `x-brd-error`,
 * most also a machine code (`x-brd-error-code`, or `x-brd-err-code` for a
 * proxy-layer one), and `x-brd-status-code` the result status. Absent
 * `x-brd-error`, the payload is the target's own, error pages included: a
 * target 404 is a billable unlock. Drilled live 2026-10-04: `no_peers`,
 * `proxy_error` and `req_timeout` answer 200 + empty body + 502; SERP's
 * `wrong_api` answers 200 + a NON-empty plain-text body + 400; and under
 * `format: "json"` the outer envelope carries NO `x-brd-*` header at all —
 * the same headers ride inside the body, beside `status_code`. So the
 * provider authors `lifecycle.start` (cloro's seam) and reads both places,
 * settling a failure as OURS = Bright Data's result status (502 when it
 * states none) / THEIRS = the 200 that carried it — the hunterio 222
 * posture, zero-billed by the engine. Billing is then flat per call.
 *
 * ERRORS ARE PLAIN TEXT, and pass through untouched (design D5). Bright
 * Data answers a rejected request with a bare string body
 * (`Invalid token`), not a JSON envelope. The engine's sniffing decode
 * already renders that faithfully as a Json string and the status flags it,
 * so there is no `output.fromError`: digesting a one-line string into
 * `{message}` would add a shape without adding information.
 *
 * Nothing to strip either — the bodies carry no billing field — so no
 * `output.fromResponse`.
 */
export default defineProvider({
    name: "brightdata",
    meta: {
        displayName: "Bright Data",
        summary:
            "Search engine results as structured JSON, and any URL fetched past bot detection.",
        description: "Bright Data — web access infrastructure for agents. " +
            "SERP API returns a Google, Bing, Yandex or DuckDuckGo results " +
            "page as parsed JSON: organic results, knowledge panel, people " +
            "also ask, related searches and pagination, as fields rather " +
            "than markup. Web Unlocker API fetches any public URL past " +
            "CAPTCHAs, bot detection and geo-blocks, returning the target's " +
            "own HTML or clean markdown. Both egress from a chosen country, retry a block rather " +
            "than returning an empty page, and charge only for requests " +
            "that complete.",
        homepageUrl: "https://brightdata.com",
        docsUrl: "https://docs.brightdata.com",
        categories: ["web-search", "web-scraping"],
        notes: [
            "Billing is per SUCCESSFUL request. A request Bright Data " +
            "rejects, or an unlock it attempts and fails (a block it " +
            "could not clear, a host that does not resolve, no peers in " +
            "the requested country), settles as a provider error carrying " +
            "Bright Data's own status and error code, and costs nothing.",
            "The TARGET's status code is not the envelope's. A page that " +
            "404s is still an unlock Bright Data performed and billed — " +
            "it answers 200, with the target's own status in the " +
            '`x-brd-status-code` response header. Send `format: "json"` ' +
            "to get that status code in the body instead.",
            "Both endpoints need a zone of the matching type on the " +
            "account. A SERP zone sent to an unblocker call (or the " +
            "reverse) is a 400, which is why the zone is credential " +
            "material and not a caller argument.",
        ],
    },
    auth: {
        /** Key + both zone names, one credential (design D1). No provider
         *  inject: the two endpoints share a wire path, so each states
         *  which zone it sends. */
        credentials: zBrightdataCredentials,
    },
    request: { baseUrl: "https://api.brightdata.com" },
    /** Unblocking is a retry loop against a hostile target, so the ceiling
     *  is generous: Bright Data's own guidance is to allow a couple of
     *  minutes for a hard page. `runMs` sits just above `requestMs` so the
     *  run never cuts off a request the transport still considers live. */
    timeouts: { requestMs: 120_000, runMs: 125_000 },
    lifecycle: {
        /** Design D4: a 2xx whose `x-brd-*` headers name a failure is a
         *  provider error. Both endpoints are synchronous, so the one
         *  provider-level start serves both. */
        start: async ({ utils }) => {
            const response = await utils.request();
            const body = response.body;
            // `format: "raw"` — the verdict rides in the envelope's headers
            const outer = response.headers["x-brd-error-code"] ??
                response.headers["x-brd-err-code"] ??
                response.headers["x-brd-error"];
            // `format: "json"` — the same headers ride inside the body
            const inner =
                utils.json.optionalGet(body, "$.headers.x-brd-error-code") ??
                    utils.json.optionalGet(body, "$.headers.x-brd-err-code") ??
                    utils.json.optionalGet(body, "$.headers.x-brd-error");
            const accepted = response.status >= 200 && response.status < 300;
            if (!accepted || (outer === undefined && inner === undefined)) {
                return {
                    kind: "COMPLETED",
                    httpStatus: response.status,
                    output: body,
                };
            }
            const stated = outer !== undefined
                ? Number(response.headers["x-brd-status-code"])
                : utils.json.optionalGet(body, "$.status_code");
            const httpStatus = typeof stated === "number" &&
                    Number.isInteger(stated) && stated >= 400 && stated <= 599
                ? stated
                : 502;
            if (outer === undefined) {
                // json: the body already IS the envelope, reason included
                return {
                    kind: "COMPLETED",
                    httpStatus,
                    providerHttpStatus: response.status,
                    output: body,
                };
            }
            // raw: headers never reach the caller, so the reason is lifted
            // into the shape `format: "json"` would have carried — a
            // failure reads the same whichever format was asked for
            const headers: Record<string, string> = {};
            for (
                const name of [
                    "x-brd-error",
                    "x-brd-error-code",
                    "x-brd-err-code",
                    "x-brd-err-msg",
                ]
            ) {
                const value = response.headers[name];
                if (value !== undefined) headers[name] = value;
            }
            return {
                kind: "COMPLETED",
                httpStatus,
                providerHttpStatus: response.status,
                output: { status_code: httpStatus, headers, body },
            };
        },
    },
    usage: {
        /** THE credit system (design D26): Bright Data publishes no credit
         *  unit — it prices both products directly in dollars per 1,000
         *  requests — so the pool IS dollars, pinned at the published
         *  pay-as-you-go rate and re-audited on repricing (the exa / apify
         *  posture). */
        credits: { default: { label: "US dollars" } },
        // no `consolidate`: Bright Data reports no meter (design D3).
    },
});
