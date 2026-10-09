import { defineProvider, presets } from "@shared/core";

/**
 * Vaquill: US primary law as an API.
 *
 * Every endpoint is a synchronous call against
 * `https://api.vaquill.ai/api/v1/...` with a `vq_key_` bearer token, so the
 * whole connector is the exa shape (sync POST + body) with the akta shape
 * (sync GET + queryParams) alongside it. Nothing here needs a lifecycle.
 *
 * EMPTY ANSWERS ARE FREE TO THE CALLER, whether or not the vendor refunds
 * them. Nine endpoints take the provider-level `consolidate` below (the
 * vendor's claim IS the bill, and a refunded miss claims 0). Four override
 * it because the vendor charges an answer the caller does not pay for:
 * `#search` (an empty page), `#section/{act_id}/body` (`available: false`),
 * `#section/{act_id}/changes` (an empty page) and `#resolve` (a citation
 * that does not resolve). Each declines the vendor's claim in that case so
 * the derived fold settles at what the caller owes; the difference is the
 * broker's cost.
 *
 * RATE CARD: the pinned `consumes.amount`s across this connector are the
 * published per-endpoint credit prices from
 * https://api.vaquill.ai/api/v1/api-credits/pricing, read 2026-09-17. That
 * endpoint is the machine-readable card and is free and unauthenticated, so
 * a repricing is checkable without a key.
 *
 * ONE pool, and the vendor reports its own draw on every response, so the
 * provider owns both halves of the settle: `credits` declares the pool,
 * `consolidate` lifts `creditsConsumed` out of the payload as the claim.
 */
export default defineProvider({
    name: "vaquill",
    meta: {
        displayName: "Vaquill",
        summary: "US primary law: statutes, regulations, and court rules.",
        description: "US primary law, retrieved and cited. Hybrid semantic " +
            "and keyword search across the United States Code, the Code of " +
            "Federal Regulations, all 50 state statutory codes plus DC and " +
            "Puerto Rico, state administrative codes, court rules, " +
            "constitutions, agency guidance and executive actions. Beyond " +
            "search: resolve a Bluebook citation to the section it names, " +
            "pull a section's full text as it stood on a past date, read " +
            "the sections that cite it, the defined terms that govern it, " +
            "its neighbours in statutory order, its amendment history, and " +
            "the equivalent provision in other states. Sourced from " +
            "official government publishers only.",
        homepageUrl: "https://www.vaquill.ai",
        docsUrl: "https://www.vaquill.ai/docs/api-guide/quickstart",
        categories: ["legal-research"],
        notes: [
            "United States law only.",
            "Every response reports its own charge on `creditsConsumed`, " +
            "and that figure settles the bill. Read it rather than " +
            "multiplying a list price.",
            "An empty answer bills 0. The vendor refunds most of them (an " +
            "unmatched cross-state comparison, an empty count or browse " +
            "level, a section nothing cites, a chapter that defines " +
            "nothing, a batch row whose text cannot be resolved); the " +
            "four it still charges (a search that matches nothing, a " +
            "section text outside the held editions, an empty change " +
            "page, a citation that does not resolve) are free to the " +
            "caller all the same.",
            "Section identifiers (`actId`) are stable and hierarchical, so " +
            "a hit from search feeds straight into every section endpoint " +
            "with no second lookup.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.vaquill.ai/api/v1" },
    /** Retrieval runs a hybrid dense + sparse search and a cross-encoder
     *  rerank, so a cold search is seconds rather than milliseconds; a
     *  `includeBody` page pulls up to 50 full statute texts alongside it. */
    timeouts: { requestMs: 60_000, runMs: 65_000 },
    usage: {
        /** THE credit system (design D26): Vaquill meters in its own
         *  credits, one pool, published at $0.01 each. The $/credit
         *  conversion stays the broker card's job. */
        credits: { default: { label: "Vaquill credits" } },
        /** The vendor's OWN claim (design D27). Every billable response
         *  carries a top-level `creditsConsumed`. Pluck it out in one
         *  motion, claim it, and leave the rest of the envelope alone.
         *
         *  The entry is OMITTED when the field is absent, never `?? 0`, so
         *  an unmetered response falls back to the derived fold. A present
         *  0 is a real answer here and prunes to an empty claim: it is what
         *  the free endpoints report, and what a refunded miss reports. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsConsumed",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
});
