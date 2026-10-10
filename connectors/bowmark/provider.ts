import { defineProvider, presets } from "@shared/core";

/**
 * Bowmark (bowmark.ai): live websites as a typed function library an agent
 * calls from code. Two synchronous JSON endpoints, Bearer auth:
 *
 *   GET  /v1/monid/library  the callable vocabulary for a task (free)
 *   POST /v1/monid/run      run a short script written against it (billed)
 *
 * The `/monid/` path segment is Bowmark's attribution channel for this
 * listing (a "destination"); the plain `/v1/library` and `/v1/run` answer
 * identically.
 *
 * BILLING (design D2). Bowmark prices a run in US dollars by the resources
 * it used (proxy traffic, browser minutes, captcha solves), with a $0.001
 * floor, and settles that into the account's monthly invoice. The run
 * envelope deliberately carries NO price, so there is no
 * `usage.consolidate` and the derived fold is the bill: a flat per-run
 * rate pinned from Bowmark's own measured average (October 2026), on a
 * dollar pool (the exa / apify posture). `library` is free.
 */
export default defineProvider({
    name: "bowmark",
    meta: {
        displayName: "Bowmark",
        summary:
            "Operate live websites from code: prices, availability, quotes and forms.",
        description: "Bowmark turns websites into a typed JavaScript " +
            "library an agent calls instead of driving a browser. Ask " +
            '/library what the task needs ("flights", "price a GPU", ' +
            '"kayak.com") and it returns the exact functions, argument ' +
            "shapes and return types; then send /run a short script " +
            "against them and get back structured data from the live " +
            "site: current prices and stock, search results behind " +
            "filters, insurance and shipping quotes, booking " +
            "availability, anything behind a form. Capabilities fan out " +
            "across several sites and route around a failing one. " +
            "Reach for it when the answer depends on what a site shows " +
            "right now and no clean API exists.",
        homepageUrl: "https://bowmark.ai",
        docsUrl: "https://bowmark.ai/docs/quickstart",
        categories: ["web-automation"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.bowmark.ai/v1/monid" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D2): Bowmark prices runs in US
         *  dollars, so the pool IS dollars. */
        credits: { default: { label: "US dollars" } },
    },
});
