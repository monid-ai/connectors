import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSitemapBody } from "./schema/inputs.ts";

/**
 * `POST /sitemap` — one domain or URL in, its link inventory out
 * (`{links: [...]}`). 1 credit per call, billed only when `links` is
 * non-empty ⇒ leaf PER_UNIT counted off the response.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Sitemap",
        summary: "Enumerate a site's URLs from its sitemap or a full " +
            "link crawl.",
        description: "Discover the link inventory of a public site: " +
            "`type: 'sitemap'` (the default) reads the published " +
            "sitemap; `type: 'all'` enumerates every link the vendor " +
            "can reach. Returns `{links: [...]}` — feed a chosen URL " +
            "to `search1api#crawl` for its content.",
        docsUrl: "https://s1.dev/docs/advanced/sitemap",
        categories: ["web-scraping"],
        notes: [
            "1 Search1API credit per call that returns results (an " +
            "empty `links` is not billed).",
        ],
    },
    request: { method: "POST", path: "/sitemap" },
    input: { schema: { body: zSitemapBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "sitemap calls with results",
            description: "one /sitemap call that returned at least one link",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `links` is non-empty — an empty answer is free
         *  to the buyer (Monid absorbs the vendor's credit). */
        evidence: ({ data, utils }) => {
            const links = utils.json.optionalGet(data.output, "$.links");
            return {
                counts: {
                    RESULT: Array.isArray(links) && links.length > 0 ? 1 : 0,
                },
            };
        },
    },
});
