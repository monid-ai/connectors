import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonSearchScraperBody } from "./schema/inputs.ts";

/**
 * axesso_data/amazon-search-scraper — Search Amazon. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Amazon",
        summary: "Extract real-time Amazon search results by keyword with " +
            "multi-page pagination.",
        description: "Extracts real-time Amazon search results by keyword " +
            "with multi-page pagination. Returns product titles, " +
            "pricing and discount info, product identifiers, star " +
            "ratings, review counts, images, availability, Prime " +
            "flags, descriptions, sponsored/organic flags, search " +
            "result positions, category hierarchies, and keyword " +
            "suggestions. Supports batch keyword processing, " +
            "marketplace targeting, category filtering, and sorting " +
            "options.",
        docsUrl: "https://apify.com/axesso_data/amazon-search-scraper",
        categories: ["amazon"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/axesso_data/amazon-search-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/axesso_data~amazon-search-scraper/runs",
    },
    input: {
        schema: {
            // the page knob lives INSIDE the `input` array items (one
            // entry per keyword, each with its own maxPages) and the
            // actor accepts entries WITHOUT it (pages then unbounded/
            // unknown) — WE require maxPages ≥ 1 on every entry and a
            // non-empty batch: the estimate must be deducible to price
            // the hold (D24). Other per-entry keys stay open (loose):
            // schema/inputs.ts remains the faithful actor mirror.
            body: zAmazonSearchScraperBody.extend({
                "input": z.array(z.looseObject({
                    "maxPages": z.number().int().min(1),
                })).min(1).describe(
                    "List of inputs, each entry refers to one keyword to be pulled. Full list of valid parameter can be found in the README tab.",
                ),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** Σ over entries of maxPages × ~10 results/page (v1
         *  PER_QUERY_PAGE_LIMIT) — maxPages required per entry at the
         *  binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            let pages = 0;
            for (const item of data.input.body.input) {
                pages += item.maxPages;
            }
            // leaf PER_UNIT·RESULT doc: the counts key is the model's unit
            return { counts: { "RESULT": pages * 10 } };
        },
    },
});
