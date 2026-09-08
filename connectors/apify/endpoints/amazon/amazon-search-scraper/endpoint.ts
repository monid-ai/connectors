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
    request: {
        method: "POST",
        path: "/v2/acts/axesso_data~amazon-search-scraper/runs",
    },
    input: { schema: { body: zAmazonSearchScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** CUSTOM estimate: the page knob lives INSIDE the `input` array
         *  items (one entry per keyword, each with its own maxPages) — no
         *  flat-field preset can see it. Σ over items of (maxPages ?? 1)
         *  × ~10 results/page. */
        estimate: ({ data, utils }) => {
            const items = utils.json.optionalGet(
                data.input.body ?? null,
                "$.input",
            );
            const list = Array.isArray(items) ? items : [];
            let pages = 0;
            for (const item of list) {
                const n = item !== null && typeof item === "object" &&
                        !Array.isArray(item)
                    ? Number(item.maxPages)
                    : NaN;
                pages += Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
            }
            // leaf PER_UNIT·RESULT doc: the counts key is the model's unit
            return { counts: { "RESULT": Math.max(pages, 1) * 10 } };
        },
    },
});
