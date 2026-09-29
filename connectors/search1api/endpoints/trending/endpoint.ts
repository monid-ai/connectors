import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTrendingBody } from "./schema/inputs.ts";

/**
 * `POST /trending` — what's hot on GitHub or Hacker News right now.
 * 1 credit per call, billed only when `results` is non-empty ⇒ leaf
 * PER_UNIT counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Trending",
        summary: "Trending GitHub repositories or Hacker News stories.",
        description: "Get the current trending list from one source: " +
            "`search_service: 'github'` returns trending repositories, " +
            "'hackernews' returns trending stories — each " +
            "{title, url, description}. A discovery surface, not a " +
            "search: for a specific topic use `search1api#search`.",
        docsUrl: "https://s1.dev/docs/advanced/trending",
        categories: ["web-search"],
        notes: [
            "1 Search1API credit per call that returns results (an " +
            "empty `results` is not billed).",
        ],
    },
    request: { method: "POST", path: "/trending" },
    input: { schema: { body: zTrendingBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "trending calls with results",
            description: "one /trending call that returned at least one item",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `results` is non-empty — an empty answer is free
         *  to the buyer (Monid absorbs the vendor's credit). */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(data.output, "$.results");
            return {
                counts: {
                    RESULT: Array.isArray(results) && results.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
