import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zKeenableSearchBody } from "./schema/inputs.ts";

const timeBound = zKeenableSearchBody.shape.query_time.unwrap().min(1)
    .optional();

/**
 * POST /v1/search — ranked web results with extracted snippets.
 *
 * Usage overrides the provider's PER_CALL: a search that found nothing
 * (`results: []`) still draws a Keenable credit (console balance delta,
 * drill 2026-09-28) but bills 0, the v1 posture (design D2).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keenable Search",
        summary: "Search the web and get ranked results with page snippets.",
        description: "Search Keenable's web index and return ranked " +
            "results with title, URL, description, and an extracted " +
            "snippet of page text. Restrict to a site, filter by " +
            "publication date or when the page was indexed, search the " +
            "index as it stood at a point in time (`query_time`), cap " +
            "snippet length (180–10000 characters) and result count " +
            "(1–50, default 10), and pick a `pro` (deeper) or " +
            "`realtime` (fastest) mode. Phrase the query as a " +
            "description of the page you want. Pipe result URLs into " +
            "Keenable /fetch when you need the full page as markdown.",
        docsUrl: "https://docs.keenable.ai/api-reference/search",
        categories: ["web-search"],
        notes: [
            "One credit per search in either mode. A search that returns " +
            "no results is free.",
        ],
    },
    request: { method: "POST", path: "/v1/search" },
    input: {
        schema: {
            body: zKeenableSearchBody.extend({
                query: zKeenableSearchBody.shape.query.min(1),
                site: zKeenableSearchBody.shape.site.unwrap().min(1)
                    .optional(),
                acquired_after: timeBound,
                acquired_before: timeBound,
                published_after: timeBound,
                published_before: timeBound,
                query_time: timeBound,
                snippet_max_length: zKeenableSearchBody.shape
                    .snippet_max_length.unwrap().min(180).max(10000)
                    .optional(),
                max_results: zKeenableSearchBody.shape.max_results
                    .unwrap().min(1).max(50).optional(),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "searches with results",
            description: "searches whose response carried at least one " +
                "result",
            consumes: { credit: "default", amount: 1 },
        },
        /** The hold promises one search. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** v1 `searchActuals`: 0 for `results: []` (the vendor still
         *  deducts the credit, the buyer is not charged) or a non-object
         *  body, 1 for any other 2xx object. */
        evidence: ({ data }) => {
            const body = data.output;
            if (
                typeof body !== "object" || body === null ||
                Array.isArray(body)
            ) {
                return { counts: { RESULT: 0 } };
            }
            const results = (body as Record<string, unknown>).results;
            const empty = Array.isArray(results) && results.length === 0;
            return { counts: { RESULT: empty ? 0 : 1 } };
        },
    },
});
