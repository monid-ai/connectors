import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zBrightdataUnlockerBody } from "./schema/inputs.ts";

/**
 * Bright Data Web Unlocker API — any public URL, fetched past whatever is
 * in the way.
 *
 * Shares `POST /request` with `brightdata#serp`, so the id is declared
 * (see the serp twin). `auth.inject` merges `unlockerZone` instead of
 * `serpZone`; that field IS the product switch (design D1).
 *
 * FLAT PER-REQUEST BILLING (design D6): $1.50 per 1,000 requests
 * pay-as-you-go, $0.0015 a call. Page weight does not enter the bill —
 * Web Unlocker API is priced per request, not per gigabyte, so a heavy
 * page and a small one settle identically and there is no metered line.
 * `render: "true"` buys a browser at no extra charge on this card.
 */
export default defineEndpoint({
    meta: {
        displayName: "Bright Data Web Unlocker API",
        summary:
            "Fetch any public URL past CAPTCHAs, bot detection and geo-blocks.",
        description: "Fetch a public web page that does not want to be " +
            "fetched, and get its content back as the target's own HTML or " +
            'as clean markdown (`data_format: "markdown"`). CAPTCHAs, TLS ' +
            "fingerprinting, " +
            "bot scoring and geo-walls are handled on the way: a block is " +
            "retried from a different IP rather than returned as an empty " +
            "page, and `country` picks where the request egresses from, so " +
            "region-locked pricing and catalogs resolve the way a local " +
            "visitor sees them. Works on any site, which is the trade " +
            "against a per-site scraper: you get the page, not parsed " +
            "fields — ask for markdown when the content is what you want " +
            "and the markup is not. The target's OWN status code rides in " +
            'the `x-brd-status-code` header, so send `format: "json"` ' +
            "when a 404 or a 403 has to be distinguished from a 200 in the " +
            "body. For a search engine's results page, the Bright Data " +
            "SERP endpoint returns parsed fields instead of markup.",
        docsUrl:
            "https://docs.brightdata.com/api-reference/rest-api/unlocker/unlock-website",
        categories: ["web-scraping", "web-extraction"],
    },
    /** Declared: the wire path is shared with the serp twin. */
    endpoint: "/unlocker",
    request: { method: "POST", path: "/request" },
    auth: {
        inject: ({ data, utils }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                Authorization: "Bearer " + data.params.apiKey,
            },
            // `merge`, not a spread: `request.body` is Json, whose union
            // includes primitives, so the spread does not type. merge is
            // the shape-tolerant primitive for exactly this.
            body: utils.json.merge(data.request.body ?? {}, {
                zone: data.params.unlockerZone,
            }),
        }),
    },
    input: { schema: { body: zBrightdataUnlockerBody } },
    usage: {
        // $1.50 / 1,000 requests, Bright Data's published pay-as-you-go
        // rate for Web Unlocker API (brightdata.com/pricing/web-unlocker,
        // read 2026-09-23). A failed unlock never reaches this line: the
        // provider's lifecycle settles it as a provider error (design D4).
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "request",
            consumes: { credit: "default", amount: 0.0015 },
        },
    },
});
